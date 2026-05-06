import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { AuthenticatedRequest } from "./auth.js";

export async function writeAuditLog(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  req: Request
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        before: before ? (before as object) : undefined,
        after: after ? (after as object) : undefined,
        ip: req.ip ?? req.socket?.remoteAddress ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}

export function auditMiddleware(entity: string, action: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const userId = req.user?.sub ?? null;
    void writeAuditLog(userId, action, entity, null, null, null, req);
    next();
  };
}
