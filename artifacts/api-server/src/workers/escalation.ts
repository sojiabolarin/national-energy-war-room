import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { recordHeartbeat } from "../lib/workerHeartbeat.js";

async function runEscalationWorker() {
  try {
    const rules = await prisma.escalationRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });

    const now = new Date();
    let escalated = 0;

    for (const rule of rules) {
      const cond = rule.condition as Record<string, unknown>;
      const ageHours = typeof cond["ageHours"] === "number" ? cond["ageHours"] : 72;
      const currentLevel = typeof cond["currentLevel"] === "number" ? cond["currentLevel"] : 1;

      const where: Record<string, unknown> = {
        escalationLevel: currentLevel,
        status: { in: ["FILED", "IN_REVIEW", "IN_PROGRESS", "ESCALATED"] },
        slaBreached: true,
        createdAt: { lte: new Date(now.getTime() - ageHours * 60 * 60 * 1000) },
      };

      if (cond["category"]) where["category"] = cond["category"];
      if (cond["discoId"]) where["discoId"] = cond["discoId"];

      const complaints = await prisma.complaint.findMany({
        where,
        select: { id: true, escalationLevel: true, ticketNumber: true },
      });

      for (const c of complaints) {
        const newLevel = Math.min(5, rule.actionLevel);
        if (newLevel <= c.escalationLevel) continue;

        await prisma.$transaction([
          prisma.complaint.update({
            where: { id: c.id },
            data: { escalationLevel: newLevel, status: "ESCALATED" },
          }),
          prisma.complaintEvent.create({
            data: {
              complaintId: c.id,
              eventType: "ESCALATED",
              fromValue: String(c.escalationLevel),
              toValue: String(newLevel),
              notes: `Auto-escalated by rule: ${rule.name}`,
            },
          }),
        ]);
        escalated++;

        if (rule.notifyOrgId) {
          const orgUsers = await prisma.user.findMany({
            where: { organisationId: rule.notifyOrgId, isActive: true },
            select: { id: true },
          });
          await prisma.notification.createMany({
            data: orgUsers.map((u) => ({
              userId: u.id,
              kind: "ESCALATION",
              title: `Complaint ${c.ticketNumber} escalated to Level ${newLevel}`,
              body: `Rule: ${rule.name}`,
              payload: { complaintId: c.id, rule: rule.name },
            })),
          });
        }
      }
    }

    recordHeartbeat("escalation-worker");
    if (escalated > 0) {
      logger.info({ escalated }, `Escalation worker: ${escalated} complaints auto-escalated`);
    }
  } catch (err) {
    logger.error({ err }, "Escalation worker error");
  }
}

export function startEscalationWorker() {
  cron.schedule("*/5 * * * *", runEscalationWorker);
  logger.info("Escalation worker started (every 5 minutes)");
}

export { runEscalationWorker };
