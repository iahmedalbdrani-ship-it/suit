import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activeProvider } from "@/lib/payments";

/** Liveness/readiness probe for the host or load balancer. Reveals no secrets. */
export async function GET() {
  const started = performance.now();
  try {
    await db().prepare("SELECT 1").get();
    return NextResponse.json(
      { ok: true, db: "up", payments: activeProvider(), latencyMs: Math.round(performance.now() - started) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
