import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

async function refreshStats() {
  try {
    const stats = await prisma.complaint.groupBy({
      by: ["status", "category", "escalationLevel"],
      _count: { id: true },
    });
    await prisma.systemSetting.upsert({
      where: { key: "complaint_stats_cache" },
      create: { key: "complaint_stats_cache", value: JSON.stringify({ refreshedAt: new Date(), stats }) },
      update: { value: JSON.stringify({ refreshedAt: new Date(), stats }) },
    });
    logger.debug("Complaint stats refreshed");
  } catch (err) {
    logger.error({ err }, "Stats refresh error");
  }
}

export function startStatsRefresher() {
  cron.schedule("*/5 * * * *", refreshStats);
  logger.info("Stats refresher started (every 5 minutes)");
}

export { refreshStats };
