// Local background-job runner. Job logic lives in src/lib/jobs/*.ts and only ever runs
// inside the Next.js server process (it imports "server-only" service files, which throw
// if required from a bare Node script) — so this script calls the same /api/cron/[job]
// route an external scheduler would call, against your locally running `npm run dev`.
//
//   npm run jobs:run   — calls every job once and exits (dev server must be running)
//   npm run jobs:watch — schedules every job on its real cadence via node-cron and stays
//                        alive, so automation actually runs on its own locally without
//                        needing a production host or an external scheduler configured yet.
import cron from "node-cron";

try {
  // Node 20.6+ built-in .env loader — this script runs standalone (not through Next.js),
  // so it needs its own env loading to pick up CRON_SECRET etc. from .env.
  process.loadEnvFile();
} catch {
  // No .env file (e.g. CI where env vars are injected directly) — fine, continue.
}

const JOB_KEYS = ["homework-overdue", "payment-reminders", "inactivity", "trial-expiry", "lead-followup", "class-reminders", "weekly-reports", "engagement-scores", "predictive-risk-scores", "attendance-auto-detect"] as const;
type JobKey = (typeof JOB_KEYS)[number];

const SCHEDULES: Record<JobKey, string> = {
  "homework-overdue": "0 * * * *", // hourly
  "payment-reminders": "0 * * * *", // hourly
  inactivity: "0 8 * * *", // daily 8am
  "trial-expiry": "0 8 * * *", // daily 8am
  "lead-followup": "0 9 * * *", // daily 9am
  "class-reminders": "*/5 * * * *", // every 5 minutes
  "weekly-reports": "0 7 * * 1", // Monday 7am
  "engagement-scores": "0 6 * * *", // daily 6am
  "predictive-risk-scores": "15 6 * * *", // daily 6:15am, just after engagement scores
  "attendance-auto-detect": "*/10 * * * *", // every 10 minutes — catches classes soon after they end
};

const BASE_URL = process.env.APP_URL || "http://localhost:3200";
const SECRET = process.env.CRON_SECRET;

async function callJob(key: JobKey) {
  if (!SECRET) throw new Error("CRON_SECRET is not set — required to call /api/cron/*. Set it in .env.");

  const res = await fetch(`${BASE_URL}/api/cron/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${key} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function runOnce() {
  console.log(`[jobs] Calling all jobs once at ${new Date().toISOString()} (${BASE_URL})`);
  for (const key of JOB_KEYS) {
    try {
      const result = await callJob(key);
      console.log(`[jobs] "${key}" done:`, result.result ?? result);
    } catch (error) {
      console.error(`[jobs] "${key}" failed:`, error instanceof Error ? error.message : error);
    }
  }
}

function watch() {
  console.log(`[jobs] Starting scheduler against ${BASE_URL} — process will stay alive. Ctrl+C to stop.`);
  console.log("[jobs] Make sure `npm run dev` (or `npm run start`) is running in another terminal.");
  for (const key of JOB_KEYS) {
    cron.schedule(SCHEDULES[key], async () => {
      console.log(`[jobs] Calling "${key}" at ${new Date().toISOString()}`);
      try {
        const result = await callJob(key);
        console.log(`[jobs] "${key}" done:`, result.result ?? result);
      } catch (error) {
        console.error(`[jobs] "${key}" failed:`, error instanceof Error ? error.message : error);
      }
    });
    console.log(`[jobs] Scheduled "${key}" (${SCHEDULES[key]})`);
  }
}

const mode = process.argv[2];
if (mode === "watch") {
  watch();
} else {
  runOnce()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[jobs] Fatal error:", error);
      process.exit(1);
    });
}
