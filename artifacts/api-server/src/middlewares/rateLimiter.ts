import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

/** Lightweight check — decode only, no crypto verify — just to pick the right limit tier */
function hasAuthToken(req: Request): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  const parts = auth.slice(7).split(".");
  return parts.length === 3; // looks like a JWT
}

/**
 * Smart global limiter:
 * - Unauthenticated (no Bearer token): 100 req/min, keyed by IP
 * - Authenticated (Bearer token present): 600 req/min, keyed by IP+auth
 * Full verification is still enforced by requireAuth — this just sets the rate budget.
 * Uses ipKeyGenerator to properly handle IPv6 addresses.
 */
export const smartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => (hasAuthToken(req) ? 600 : 100),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? "")}:${hasAuthToken(req) ? "auth" : "anon"}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

/** Retained for backwards-compat imports */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

export const complaintSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many complaint submissions" } },
});
