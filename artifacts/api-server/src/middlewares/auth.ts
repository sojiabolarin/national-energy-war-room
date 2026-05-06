import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    role: string;
    organisationId?: string | null;
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    logger.debug({ err }, "Token verification failed");
    res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Invalid or expired token" } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    if (req.user.role === "CITIZEN") {
      res.status(403).json({ error: { code: "STAFF_ONLY", message: "Staff-only endpoint" } });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient role" } });
      return;
    }
    next();
  };
}

export function requireStaff(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  if (req.user.role === "CITIZEN") {
    res.status(403).json({ error: { code: "STAFF_ONLY", message: "Staff-only endpoint" } });
    return;
  }
  next();
}
