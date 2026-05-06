import jwt from "jsonwebtoken";
import { logger } from "./logger.js";

const getPrivateKey = (): string => {
  const b64 = process.env["JWT_PRIVATE_KEY"];
  if (!b64) throw new Error("JWT_PRIVATE_KEY env var not set");
  return Buffer.from(b64, "base64").toString("utf-8");
};

const getPublicKey = (): string => {
  const b64 = process.env["JWT_PUBLIC_KEY"];
  if (!b64) throw new Error("JWT_PUBLIC_KEY env var not set");
  return Buffer.from(b64, "base64").toString("utf-8");
};

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  organisationId?: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const expiry = process.env["JWT_EXPIRY"] || "15m";
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: "RS256",
    expiresIn: expiry as jwt.SignOptions["expiresIn"],
    issuer: "warroom-api",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getPublicKey(), {
    algorithms: ["RS256"],
    issuer: "warroom-api",
  }) as AccessTokenPayload;
}

export function decodeTokenUnsafe(token: string): AccessTokenPayload | null {
  try {
    return jwt.decode(token) as AccessTokenPayload;
  } catch {
    logger.warn("Failed to decode token");
    return null;
  }
}
