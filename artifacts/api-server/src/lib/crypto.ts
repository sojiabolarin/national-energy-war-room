import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const hex = process.env["ENCRYPTION_KEY"];
  if (!hex) throw new Error("ENCRYPTION_KEY env var not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function encryptNin(nin: string | undefined | null): string | null {
  if (!nin) return null;
  return encrypt(nin);
}

export function decryptNin(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}
