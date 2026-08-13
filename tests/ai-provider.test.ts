import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  AIError,
  generateDescription,
  getAIConfig,
  isAIConfigured,
  validateGeneratedDescription,
  type AIEvidence,
  type AIConfig,
} from "../lib/ai";

const config: AIConfig = {
  apiKey: "sk-test-not-a-real-key",
  apiUrl: "https://ai.example.test/v1",
  model: "test-model",
};

const evidence: AIEvidence = {
  date: "2026-08-10",
  location: "WFH",
  startTime: "08:00",
  endTime: "16:00",
  manualActivities: ["Menulis kode"],
  commits: [],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

test("missing api key throws not-configured", async () => {
  delete process.env.AI_API_KEY;
  assert.equal(isAIConfigured(), false);
  assert.equal(getAIConfig(), null);
  await assert.rejects(
    () => generateDescription(evidence, { ...config, apiKey: "" }),
    (error: unknown) => error instanceof AIError && error.code === "not-configured"
  );
});

test("successful response returns the draft", async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      choices: [{ message: { content: "  Hari ini saya menulis kode autentikasi.  " } }],
    }) as Response;

  const draft = await generateDescription(evidence, config);
  assert.equal(draft, "Hari ini saya menulis kode autentikasi.");
});

test("rate limited (429) surfaces rate-limited error", async () => {
  globalThis.fetch = async () => jsonResponse({ error: "rate limit" }, 429) as Response;
  await assert.rejects(
    () => generateDescription(evidence, config),
    (error: unknown) => error instanceof AIError && error.code === "rate-limited"
  );
});

test("provider unavailable (500) surfaces provider error", async () => {
  globalThis.fetch = async () => jsonResponse({ error: "boom" }, 500) as Response;
  await assert.rejects(
    () => generateDescription(evidence, config),
    (error: unknown) => error instanceof AIError && error.code === "provider"
  );
});

test("network failure surfaces network error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => generateDescription(evidence, config),
    (error: unknown) => error instanceof AIError && error.code === "network"
  );
});

test("malformed json surfaces invalid-response", async () => {
  globalThis.fetch = async () =>
    new Response("<html>not json</html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }) as Response;
  await assert.rejects(
    () => generateDescription(evidence, config),
    (error: unknown) => error instanceof AIError && error.code === "invalid-response"
  );
});

test("empty model response surfaces empty-response", async () => {
  globalThis.fetch = async () => jsonResponse({ choices: [] }) as Response;
  await assert.rejects(
    () => generateDescription(evidence, config),
    (error: unknown) => error instanceof AIError && error.code === "empty-response"
  );
});

test("missing choices field surfaces empty-response", async () => {
  globalThis.fetch = async () => jsonResponse({ foo: "bar" }) as Response;
  await assert.rejects(
    () => generateDescription(evidence, config),
    (error: unknown) => error instanceof AIError && error.code === "empty-response"
  );
});

test("request sends model, messages and bearer auth to the configured url", async () => {
  let captured: RequestInit | undefined;
  let capturedUrl = "";
  globalThis.fetch = async (url: unknown, init?: RequestInit) => {
    capturedUrl = String(url);
    captured = init;
    return jsonResponse({ choices: [{ message: { content: "draft" } }] }) as Response;
  };

  await generateDescription(evidence, config);

  assert.equal(capturedUrl, "https://ai.example.test/v1/chat/completions");
  assert.equal(captured?.method, "POST");
  const headers = captured?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer sk-test-not-a-real-key");
  const body = JSON.parse(String(captured?.body)) as {
    model: string;
    messages: { role: string; content: string }[];
  };
  assert.equal(body.model, "test-model");
  assert.equal(body.messages.length, 2);
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[1].role, "user");
  assert.ok(body.messages[1].content.includes("[DATA]"));
});

test("validateGeneratedDescription trims and caps length", () => {
  assert.equal(validateGeneratedDescription("  teks  "), "teks");
  assert.equal(
    validateGeneratedDescription("baris\nberikutnya"),
    "baris\nberikutnya"
  );
  assert.throws(
    () => validateGeneratedDescription(""),
    (error: unknown) => error instanceof AIError && error.code === "empty-response"
  );
  assert.throws(
    () => validateGeneratedDescription("   \n "),
    (error: unknown) => error instanceof AIError && error.code === "empty-response"
  );
});
