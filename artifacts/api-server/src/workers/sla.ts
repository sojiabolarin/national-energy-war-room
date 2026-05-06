import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const SLA_WINDOWS_HOURS: Record<string, number> = {
  ELECTROCUTION: 0,
  SUPPLY_INTERRUPTION: 24,
  METERING: 5 * 8,
  BILLING: 15 * 8,
  ESTIMATED_BILLING: 15 * 8,
  VOLTAGE: 48,
  INFRASTRUCTURE_DAMAGE: 48,
  CONNECTION_DELAY: 5 * 8,
  DISCONNECTION: 48,
  REFUND: 15 * 8,
  ENERGY_THEFT_REPORT: 72,
  OTHER: 5 * 8,
};

async function runSlaTracker() {
  try {
    const openComplaints = await prisma.complaint.findMany({
      where: { status: { in: ["FILED", "IN_REVIEW", "IN_PROGRESS", "ESCALATED"] }, slaBreached: false },
      select: { id: true, category: true, createdAt: true, ticketNumber: true },
    });

    const now = new Date();
    let breached = 0;

    for (const c of openComplaints) {
      const windowHours = SLA_WINDOWS_HOURS[c.category] ?? 120;
      const breachTime = new Date(c.createdAt.getTime() + windowHours * 60 * 60 * 1000);
      if (now >= breachTime) {
        await prisma.$transaction([
          prisma.complaint.update({
            where: { id: c.id },
            data: { slaBreached: true, slaBreachAt: breachTime },
          }),
          prisma.complaintEvent.create({
            data: { complaintId: c.id, eventType: "SLA_BREACHED", notes: `SLA window of ${windowHours}h exceeded` },
          }),
        ]);
        breached++;
      }
    }

    if (breached > 0) {
      logger.info({ breached }, `SLA tracker: ${breached} complaints marked as breached`);
    }
  } catch (err) {
    logger.error({ err }, "SLA tracker error");
  }
}

export function startSlaTracker() {
  cron.schedule("* * * * *", runSlaTracker);
  logger.info("SLA tracker started (every 1 minute)");
}

export { runSlaTracker };
