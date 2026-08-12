async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = Buffer.concat([
    Buffer.from(iv),
    Buffer.from(ciphertext),
  ]);
  return combined.toString("base64");
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await getKey();
  const combined = Buffer.from(payload, "base64");
  const iv = combined.subarray(0, 12);
  const data = combined.subarray(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return new TextDecoder().decode(plaintext);
}
