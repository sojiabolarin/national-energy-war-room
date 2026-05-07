import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { logger } from "../../lib/logger.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
import type { Request, Response } from "express";

const router = Router();

const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE = "rt";

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  fullName: z.string().min(2),
  nin: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

async function issueTokens(userId: string, email: string, role: string, organisationId: string | null) {
  const accessToken = signAccessToken({ sub: userId, email, role, organisationId });
  const refreshToken = randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);
  await prisma.refreshToken.create({ data: { userId, token: refreshToken, expiresAt } });
  return { accessToken, refreshToken, expiresAt };
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/api/v1/auth",
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
}

router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, phone, password, fullName } = req.body as z.infer<typeof registerSchema>;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email already registered" } });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, phone, passwordHash, fullName, role: "CITIZEN" },
    });
    const { accessToken, refreshToken, expiresAt } = await issueTokens(user.id, user.email, user.role, user.organisationId);
    setRefreshCookie(res, refreshToken, expiresAt);
    res.status(201).json({ data: { accessToken, user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName } } });
  } catch (err) {
    logger.error({ err }, "Register failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Registration failed" } });
  }
});

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const { accessToken, refreshToken, expiresAt } = await issueTokens(user.id, user.email, user.role, user.organisationId);
    setRefreshCookie(res, refreshToken, expiresAt);
    res.json({ data: { accessToken, user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName, organisationId: user.organisationId } } });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Login failed" } });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    // Read refresh token exclusively from httpOnly cookie
    const refreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!refreshToken) {
      res.status(401).json({ error: { code: "MISSING_TOKEN", message: "No refresh token" } });
      return;
    }
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) {
      clearRefreshCookie(res);
      res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid or expired refresh token" } });
      return;
    }
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const { accessToken, refreshToken: newRefresh, expiresAt } = await issueTokens(stored.user.id, stored.user.email, stored.user.role, stored.user.organisationId);
    setRefreshCookie(res, newRefresh, expiresAt);
    res.json({ data: { accessToken } });
  } catch (err) {
    logger.error({ err }, "Refresh failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Token refresh failed" } });
  }
});

router.post("/logout", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } else {
      // Fallback: also accept body-supplied token for backwards compatibility
      const bodyToken = (req.body as { refreshToken?: string }).refreshToken;
      if (bodyToken) await prisma.refreshToken.deleteMany({ where: { token: bodyToken } });
    }
    clearRefreshCookie(res);
    res.json({ data: { message: "Logged out" } });
  } catch (err) {
    logger.error({ err }, "Logout failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Logout failed" } });
  }
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, email: true, role: true, fullName: true, phone: true, organisationId: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json({ data: user });
  } catch (err) {
    logger.error({ err }, "Get me failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get user" } });
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: { code: "MISSING_EMAIL", message: "Email required" } });
    return;
  }
  logger.info({ email }, "Password reset requested (stub - no email sent)");
  res.json({ data: { message: "If that email exists, a reset link has been sent" } });
});

router.post("/reset-password", async (_req: Request, res: Response) => {
  res.json({ data: { message: "Password reset stub - not implemented" } });
});

export default router;
