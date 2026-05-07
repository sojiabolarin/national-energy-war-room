import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startEscalationWorker, runEscalationWorker } from "./workers/escalation.js";
import { startSlaTracker, runSlaTracker } from "./workers/sla.js";
import { startStatsRefresher, refreshStats } from "./workers/stats.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "National Energy War Room API Server listening");

  // Run all workers once immediately so /healthz reports healthy on first request
  Promise.all([runSlaTracker(), runEscalationWorker(), refreshStats()]).catch((err) => {
    logger.warn({ err }, "Initial worker run failed (non-fatal)");
  });

  startSlaTracker();
  startEscalationWorker();
  startStatsRefresher();
});
