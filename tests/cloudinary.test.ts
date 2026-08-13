import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  CloudinaryError,
  deleteCloudinaryImage,
  detectImageFormat,
  isCloudinaryConfigured,
  MAX_PHOTO_BYTES,
  uploadImageToCloudinary,
} from "../lib/cloudinary";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

function multipartBodyToSignatureSource(body: FormData): string {
  const params: Record<string, string> = {};
  for (const key of ["timestamp", "folder", "public_id"]) {
    const value = body.get(key);
    if (typeof value === "string") params[key] = value;
  }
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

test("detectImageFormat recognizes JPEG, PNG, and WebP magic bytes", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  assert.equal(detectImageFormat(jpeg), "jpeg");

  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  assert.equal(detectImageFormat(png), "png");

  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  assert.equal(detectImageFormat(webp), "webp");
});

test("detectImageFormat null for unsupported bytes and empty buffer", () => {
  assert.equal(detectImageFormat(new Uint8Array()), null);
  assert.equal(
    detectImageFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
    null
  );
  assert.equal(
    detectImageFormat(new Uint8Array([0xff, 0xd8])),
    null
  );
});

test("isCloudinaryConfigured requires all three env vars", () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  assert.equal(isCloudinaryConfigured(), false);

  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
  assert.equal(isCloudinaryConfigured(), true);
});

test("uploadImageToCloudinary sends signed multipart request and parses result", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "api-key";
  process.env.CLOUDINARY_API_SECRET = "api-secret";
  process.env.CLOUDINARY_API_URL = "https://api.example.test/v1_1/test-cloud";

  let sentForm: FormData | null = null;
  let sentEndpoint = "";
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    sentEndpoint = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST") {
      sentForm = init?.body as FormData;
    }
    return new Response(
      JSON.stringify({
        public_id: "documentation/abc123",
        secure_url: "https://res.example.test/documentation/abc123.jpg",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const pixel = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const result = await uploadImageToCloudinary(pixel, { folder: "reports/r1" });

  assert.deepEqual(result, {
    publicId: "documentation/abc123",
    url: "https://res.example.test/documentation/abc123.jpg",
  });
  assert.equal(sentEndpoint, "https://api.example.test/v1_1/test-cloud/image/upload");
  assert.ok(sentForm);
  const sent = sentForm as FormData;
  assert.equal(sent.get("api_key"), "api-key");
  assert.equal(sent.get("folder"), "reports/r1");
  assert.equal(typeof sent.get("signature"), "string");
  assert.equal(typeof sent.get("timestamp"), "string");
});

test("uploadImageToCloudinary signature matches HMAC-ish sha1 of sorted params + secret", async () => {
  const { createHash } = await import("node:crypto");
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "SECRET";
  process.env.CLOUDINARY_API_URL = "https://mock.test";

  let sentForm: FormData | null = null;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentForm = init?.body as FormData;
    return new Response(
      JSON.stringify({ public_id: "a", secure_url: "https://x.test/a.jpg" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  await uploadImageToCloudinary(new Uint8Array([1]));
  const expected = createHash("sha1")
    .update(
      `${multipartBodyToSignatureSource(sentForm!)}SECRET`
    )
    .digest("hex");
  assert.equal(sentForm!.get("signature"), expected);
});

test("uploadImageToCloudinary throws CloudinaryError when not configured", async () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_API_URL;
  await assert.rejects(
    uploadImageToCloudinary(new Uint8Array([1])),
    (error: unknown) =>
      error instanceof CloudinaryError && error.code === "not-configured"
  );
});

test("uploadImageToCloudinary throws 'provider' on error body", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
  process.env.CLOUDINARY_API_URL = "https://mock.test";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { message: "Invalid file type" } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

  await assert.rejects(
    uploadImageToCloudinary(new Uint8Array([1])),
    (error: unknown) =>
      error instanceof CloudinaryError &&
      error.code === "provider" &&
      error.message.includes("Invalid file type")
  );
});

test("uploadImageToCloudinary throws 'network' when fetch fails", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
  process.env.CLOUDINARY_API_URL = "https://mock.test";

  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  await assert.rejects(
    uploadImageToCloudinary(new Uint8Array([1])),
    (error: unknown) =>
      error instanceof CloudinaryError && error.code === "network"
  );
});

test("uploadImageToCloudinary throws 'invalid-response' for missing fields", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
  process.env.CLOUDINARY_API_URL = "https://mock.test";

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ public_id: "x" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    uploadImageToCloudinary(new Uint8Array([1])),
    (error: unknown) =>
      error instanceof CloudinaryError && error.code === "invalid-response"
  );
});

test("deleteCloudinaryImage sends signed destroy request", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
  process.env.CLOUDINARY_API_URL = "https://mock.test";

  let sentEndpoint = "";
  let sentForm: FormData | null = null;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    sentEndpoint = String(input);
    sentForm = init?.body as FormData;
    return new Response(JSON.stringify({ result: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await deleteCloudinaryImage("documentation/abc");
  assert.equal(sentEndpoint, "https://mock.test/image/destroy");
  assert.equal(sentForm!.get("public_id"), "documentation/abc");
  assert.equal(typeof sentForm!.get("signature"), "string");
});

test("deleteCloudinaryImage throws 'provider' when result is not ok", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
  process.env.CLOUDINARY_API_URL = "https://mock.test";

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ result: "not found" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    deleteCloudinaryImage("a/b"),
    (error: unknown) =>
      error instanceof CloudinaryError && error.code === "provider"
  );
});

test("MAX_PHOTO_BYTES is 8 MiB", () => {
  assert.equal(MAX_PHOTO_BYTES, 8 * 1024 * 1024);
});