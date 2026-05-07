import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import prisma from "../../lib/prisma.js";
import { encryptNin } from "../../lib/crypto.js";
import { validate } from "../../middlewares/validate.js";
import { complaintSubmitLimiter } from "../../middlewares/rateLimiter.js";
import { requireAuth } from "../../middlewares/auth.js";
import { logger } from "../../lib/logger.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";

const router = Router();

// ── Public DisCo lookup (no auth required — used by citizen complaint form) ──
router.get("/discos", async (_req, res) => {
  try {
    const discos = await prisma.disCo.findMany({
      select: { id: true, name: true, operatorOrg: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ data: discos });
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Could not load DisCos" } });
  }
});

function generateTicketNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `WR-${y}${m}${d}-${seq}`;
}

const fileComplaintSchema = z.object({
  citizenName: z.string().min(2),
  citizenPhone: z.string().min(10),
  citizenEmail: z.string().email().optional(),
  citizenNin: z.string().optional(),
  discoId: z.string().uuid(),
  feederId: z.string().uuid().optional(),
  category: z.enum([
    "METERING","BILLING","ESTIMATED_BILLING","SUPPLY_INTERRUPTION",
    "VOLTAGE","ELECTROCUTION","INFRASTRUCTURE_DAMAGE","CONNECTION_DELAY",
    "DISCONNECTION","REFUND","ENERGY_THEFT_REPORT","OTHER",
  ]),
  subCategory: z.string().optional(),
  description: z.string().min(10),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  source: z.enum(["WEB","WHATSAPP","NERC_PORTAL","FORUM_OFFICE","IN_PERSON","EMAIL","IMPORT"]).default("WEB"),
  photos: z.array(
    z.string()
      .refine((s) => /^data:image\/(jpeg|jpg|png|webp|gif|bmp);base64,/.test(s), {
        message: "Each photo must be a valid image data URL (jpeg, png, webp, gif, bmp)",
      })
  ).max(3).optional(),
});

const MAX_PHOTO_BINARY_BYTES = 10 * 1024 * 1024; // 10 MB total decoded

function totalDecodedPhotoBytes(photos: string[]): number {
  return photos.reduce((total, dataUrl) => {
    const base64 = dataUrl.split(",")[1] ?? "";
    // base64 string length → approximate binary bytes
    const padding = (base64.match(/=+$/) ?? [""])[0].length;
    return total + Math.floor((base64.length * 3) / 4) - padding;
  }, 0);
}

router.post("/", complaintSubmitLimiter, validate(fileComplaintSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof fileComplaintSchema>;

    // Server-side photo enforcement: count ≤ 3, MIME already validated by schema,
    // total decoded binary ≤ 10 MB
    if (body.photos && body.photos.length > 0) {
      if (body.photos.length > 3) {
        res.status(400).json({ error: { code: "TOO_MANY_PHOTOS", message: "Maximum 3 photos allowed" } });
        return;
      }
      const totalBytes = totalDecodedPhotoBytes(body.photos);
      if (totalBytes > MAX_PHOTO_BINARY_BYTES) {
        res.status(400).json({ error: { code: "PHOTOS_TOO_LARGE", message: "Total photo size must not exceed 10 MB" } });
        return;
      }
    }

    const disco = await prisma.disCo.findUnique({ where: { id: body.discoId } });
    if (!disco) {
      res.status(400).json({ error: { code: "INVALID_DISCO", message: "DisCo not found" } });
      return;
    }

    let ticketNumber = generateTicketNumber();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await prisma.complaint.findUnique({ where: { ticketNumber } });
      if (!exists) break;
      ticketNumber = generateTicketNumber();
      attempts++;
    }

    const satisfactionToken = randomBytes(32).toString("hex");
    const complaint = await prisma.complaint.create({
      data: {
        ticketNumber,
        source: body.source,
        citizenName: body.citizenName,
        citizenPhone: body.citizenPhone,
        citizenEmail: body.citizenEmail,
        citizenNinEncrypted: encryptNin(body.citizenNin),
        discoId: body.discoId,
        feederId: body.feederId,
        category: body.category,
        subCategory: body.subCategory,
        description: body.description,
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
        satisfactionToken,
        status: "FILED",
        severity: body.category === "ELECTROCUTION" ? "CRITICAL" : "MEDIUM",
        escalationLevel: body.category === "ELECTROCUTION" ? 3 : 1,
        attachments: body.photos && body.photos.length > 0
          ? { photos: body.photos.map((dataUrl, i) => ({ index: i, dataUrl })) }
          : undefined,
      },
    });

    await prisma.complaintEvent.create({
      data: {
        complaintId: complaint.id,
        eventType: "CREATED",
        notes: `Complaint filed via ${body.source}`,
      },
    });

    logger.info({ ticketNumber: complaint.ticketNumber }, "Complaint filed");
    res.status(201).json({
      data: {
        ticketNumber: complaint.ticketNumber,
        id: complaint.id,
        status: complaint.status,
        satisfactionToken,
        message: "Your complaint has been filed. Track it using your ticket number.",
        trackUrl: `/complaints/track`,
        whatsappDeepLink: `https://wa.me/?text=My%20National%20Energy%20War%20Room%20complaint%20ticket:%20${complaint.ticketNumber}`,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to file complaint");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to file complaint" } });
  }
});

router.get("/track/:ticketNumber", async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const phoneLast4 = req.query["phoneLast4"] as string;

    if (!phoneLast4 || phoneLast4.length !== 4) {
      res.status(400).json({ error: { code: "PHONE_REQUIRED", message: "Last 4 digits of phone required" } });
      return;
    }

    const complaint = await prisma.complaint.findUnique({
      where: { ticketNumber },
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 10 },
        disco: { select: { id: true, name: true } },
        feeder: { select: { id: true, name: true } },
      },
    });

    if (!complaint || !complaint.citizenPhone.endsWith(phoneLast4)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Complaint not found or phone mismatch" } });
      return;
    }

    const { citizenNinEncrypted, citizenPhone, citizenEmail, satisfactionToken, ...safe } = complaint;
    res.json({ data: { ...safe, citizenPhone: `****${phoneLast4}` } });
  } catch (err) {
    logger.error({ err }, "Track complaint failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to track complaint" } });
  }
});

router.post("/:id/citizen-response", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, phoneLast4 } = req.body as { message?: string; phoneLast4?: string };

    if (!message || !phoneLast4) {
      res.status(400).json({ error: { code: "MISSING_FIELDS", message: "message and phoneLast4 required" } });
      return;
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint || !complaint.citizenPhone.endsWith(phoneLast4)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Complaint not found" } });
      return;
    }

    await prisma.complaintEvent.create({
      data: { complaintId: id, eventType: "CITIZEN_RESPONDED", notes: message },
    });

    res.json({ data: { message: "Response recorded" } });
  } catch (err) {
    logger.error({ err }, "Citizen response failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to record response" } });
  }
});

router.post("/:id/satisfaction", async (req, res) => {
  try {
    const { id } = req.params;
    const { token, score, feedback } = req.body as { token?: string; score?: number; feedback?: string };

    if (!token || score === undefined) {
      res.status(400).json({ error: { code: "MISSING_FIELDS", message: "token and score required" } });
      return;
    }
    if (score < 1 || score > 5) {
      res.status(400).json({ error: { code: "INVALID_SCORE", message: "Score must be 1–5" } });
      return;
    }

    const complaint = await prisma.complaint.findFirst({
      where: { id, satisfactionToken: token },
    });

    if (!complaint) {
      res.status(404).json({ error: { code: "INVALID_TOKEN", message: "Invalid satisfaction token" } });
      return;
    }

    await prisma.complaint.update({
      where: { id },
      data: { satisfactionScore: score, satisfactionFeedback: feedback },
    });

    res.json({ data: { message: "Thank you for your feedback!" } });
  } catch (err) {
    logger.error({ err }, "Satisfaction failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to record satisfaction" } });
  }
});

// SSE: real-time complaint count push (used by complaints panel)
router.get("/stream-alerts", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = async () => {
    try {
      const [totalOpen, slaBreachCount] = await Promise.all([
        prisma.complaint.count({ where: { status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] } } }),
        prisma.complaint.count({ where: { slaBreached: true, status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] } } }),
      ]);
      res.write(`data: ${JSON.stringify({ totalOpen, slaBreachCount, timestamp: new Date().toISOString() })}\n\n`);
    } catch { /* ignore */ }
  };

  await send();
  const interval = setInterval(send, 15000);
  req.on("close", () => clearInterval(interval));
});

const whatsappMessageSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        messages: z.array(z.object({
          from: z.string(),
          text: z.object({ body: z.string() }).optional(),
        })).optional(),
      }).optional(),
    })).optional(),
  })).optional(),
}).passthrough();

router.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env["WHATSAPP_VERIFY_TOKEN"]) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

router.post("/whatsapp/webhook", async (req, res) => {
  try {
    const body = whatsappMessageSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: { code: "INVALID_PAYLOAD" } });
      return;
    }

    const entries = body.data.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? [];
        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body ?? "(no text)";
          const phoneLast4 = from.slice(-4);

          const existing = await prisma.complaint.findFirst({
            where: {
              citizenPhone: { endsWith: phoneLast4 },
              status: { not: "RESOLVED" },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: "desc" },
          });

          if (existing) {
            await prisma.complaintEvent.create({
              data: { complaintId: existing.id, eventType: "CITIZEN_RESPONDED", notes: `WhatsApp: ${text}` },
            });
            logger.info({ ticketNumber: existing.ticketNumber }, "WhatsApp message appended to complaint");
          } else {
            const disco = await prisma.disCo.findFirst();
            if (disco) {
              const ticket = generateTicketNumber();
              const satisfactionToken = randomBytes(32).toString("hex");
              const complaint = await prisma.complaint.create({
                data: {
                  ticketNumber: ticket,
                  source: "WHATSAPP",
                  citizenName: "WhatsApp User",
                  citizenPhone: from,
                  discoId: disco.id,
                  category: "OTHER",
                  description: text,
                  satisfactionToken,
                },
              });
              await prisma.complaintEvent.create({
                data: { complaintId: complaint.id, eventType: "CREATED", notes: "Filed via WhatsApp" },
              });
              logger.info({ ticket, from }, `[WhatsApp STUB] Reply: Your complaint has been filed. Ticket: ${ticket}`);
            }
          }
        }
      }
    }
    res.status(200).json({ data: { status: "ok" } });
  } catch (err) {
    logger.error({ err }, "WhatsApp webhook failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
