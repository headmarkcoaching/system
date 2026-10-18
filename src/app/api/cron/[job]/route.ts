import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { JOB_REGISTRY, runJob, type JobKey } from "@/lib/jobs";

// Constant-time secret comparison — found during a security review that this used plain `!==`,
// which short-circuits on the first mismatched byte and so leaks (via response timing) how many
// leading characters of a guess are correct. Hashing both sides first gives timingSafeEqual two
// fixed-length buffers, sidestepping its own requirement that inputs be equal length (which a
// raw length check would otherwise leak on its own).
function secretsMatch(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// Server-to-server endpoint for an external scheduler (Vercel Cron, a host crontab,
// Windows Task Scheduler + curl, GitHub Actions, ...). Auth is a shared secret checked
// here directly — NOT session-based — since the caller isn't a logged-in browser.
// middleware.ts explicitly excludes /api/cron from its session-redirect logic.
//
// Vercel's built-in scheduler calls with GET (and sends the CRON_SECRET environment variable as a
// Bearer token on its own); every other scheduler in README.md uses POST. Both go through the same
// secret check and run the same job.
async function handle(request: NextRequest, props: { params: Promise<{ job: string }> }) {
  const params = await props.params;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!secretsMatch(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = params.job as JobKey;
  if (!(job in JOB_REGISTRY)) {
    return NextResponse.json({ error: `Unknown job "${job}". Known jobs: ${Object.keys(JOB_REGISTRY).join(", ")}` }, { status: 404 });
  }

  try {
    const result = await runJob(job);
    return NextResponse.json({ job, result });
  } catch (error) {
    return NextResponse.json({ job, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;

export const dynamic = "force-dynamic";
// Some jobs message many parents in one run; give them more than the default function time limit (the Zoom recording copy needs the most).
export const maxDuration = 300;
