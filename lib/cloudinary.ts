import { createHash } from "node:crypto";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type CloudinaryErrorCode =
  | "not-configured"
  | "network"
  | "provider"
  | "invalid-response";

export class CloudinaryError extends Error {
  constructor(
    message: string,
    public readonly code: CloudinaryErrorCode = "provider",
    public readonly status?: number
  ) {
    super(message);
    this.name = "CloudinaryError";
  }
}

export type ImageFormat = "jpeg" | "png" | "webp";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function detectImageFormat(buffer: Uint8Array): ImageFormat | null {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    buffer.length >= 8 &&
    pngSignature.every((byte, index) => buffer[index] === byte)
  ) {
    return "png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

function cloudinarySignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  const query = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${query}${apiSecret}`).digest("hex");
}

function resolveApiBase(config: CloudinaryConfig): string {
  return (
    process.env.CLOUDINARY_API_URL ||
    `https://api.cloudinary.com/v1_1/${config.cloudName}`
  ).replace(/\/+$/, "");
}

export type UploadResult = {
  publicId: string;
  url: string;
};

export async function uploadImageToCloudinary(
  buffer: Uint8Array,
  options: { folder?: string; publicId?: string } = {}
): Promise<UploadResult> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new CloudinaryError(
      "Fitur dokumentasi belum dikonfigurasi.",
      "not-configured"
    );
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = options.folder ?? "documentation";
  const signParams: Record<string, string> = { timestamp, folder };
  if (options.publicId) signParams.public_id = options.publicId;
  const signature = cloudinarySignature(signParams, config.apiSecret);

  const form = new FormData();
  form.set("file", new Blob([buffer as BlobPart]), "photo");
  form.set("api_key", config.apiKey);
  form.set("timestamp", timestamp);
  form.set("signature", signature);
  form.set("folder", folder);
  if (options.publicId) form.set("public_id", options.publicId);

  const endpoint = `${resolveApiBase(config)}/image/upload`;

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: form });
  } catch {
    throw new CloudinaryError("Gagal terhubung ke layanan gambar.", "network");
  }

  if (!response.ok) {
    let message = "Upload gambar gagal. Coba lagi.";
    try {
      const data = (await response.json()) as {
        error?: { message?: string };
      };
      if (data?.error?.message) message = data.error.message;
    } catch {
      // keep default message
    }
    throw new CloudinaryError(message, "provider", response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new CloudinaryError(
      "Respons layanan gambar tidak valid.",
      "invalid-response"
    );
  }

  const typed = data as {
    public_id?: unknown;
    secure_url?: unknown;
    error?: { message?: unknown };
  };
  if (typed?.error?.message) {
    throw new CloudinaryError(String(typed.error.message), "provider");
  }
  if (
    typeof typed?.public_id !== "string" ||
    typeof typed?.secure_url !== "string"
  ) {
    throw new CloudinaryError(
      "Respons layanan gambar tidak valid.",
      "invalid-response"
    );
  }
  return { publicId: typed.public_id, url: typed.secure_url };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new CloudinaryError(
      "Fitur dokumentasi belum dikonfigurasi.",
      "not-configured"
    );
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signParams: Record<string, string> = { public_id: publicId, timestamp };
  const signature = cloudinarySignature(signParams, config.apiSecret);

  const form = new FormData();
  form.set("public_id", publicId);
  form.set("api_key", config.apiKey);
  form.set("timestamp", timestamp);
  form.set("signature", signature);

  const endpoint = `${resolveApiBase(config)}/image/destroy`;

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: form });
  } catch {
    throw new CloudinaryError("Gagal terhubung ke layanan gambar.", "network");
  }

  if (!response.ok) {
    throw new CloudinaryError(
      "Gagal menghapus gambar dari layanan.",
      "provider",
      response.status
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new CloudinaryError(
      "Respons layanan gambar tidak valid.",
      "invalid-response"
    );
  }

  const typed = data as { result?: unknown; error?: { message?: unknown } };
  if (typed?.error?.message) {
    throw new CloudinaryError(String(typed.error.message), "provider");
  }
  if (typed?.result !== "ok") {
    throw new CloudinaryError(
      "Gagal menghapus gambar dari layanan.",
      "provider"
    );
  }
}