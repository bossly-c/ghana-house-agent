// src/app/api/health/route.ts
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({
      ok: true,
      app: "Ghana House Agent",
      db: "connected",
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return Response.json(
      {
        ok: false,
        app: "Ghana House Agent",
        db: "unreachable",
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}