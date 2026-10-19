import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, properties, propertyUnits, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "gha_super_secret_jwt_key_2026"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [row] = await db
      .select()
      .from(properties)
      .leftJoin(agents, eq(properties.agentId, agents.id))
      .where(eq(properties.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .update(properties)
      .set({ views: (row.properties.views ?? 0) + 1 })
      .where(eq(properties.id, id));

    const units = row.properties.isCompound
      ? await db
          .select()
          .from(propertyUnits)
          .where(eq(propertyUnits.propertyId, id))
          .orderBy(propertyUnits.position)
      : [];

    const property = {
      ...row.properties,
      units,
      agent: row.agents
        ? {
            name:     row.agents.name,
            phone:    row.agents.phone,
            whatsapp: row.agents.whatsapp,
            avatar:   row.agents.avatar,
          }
        : null,
    };

    return NextResponse.json({ property });
  } catch (e) {
    console.error("[GET /api/properties/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/properties/[id] ───────────────────────────────────────────
// ── DELETE /api/properties/[id] ───────────────────────────────────────────
// ── DELETE /api/properties/[id] ──────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    let payload: any;
    try {
      const { payload: p } = await jwtVerify(token, SECRET);
      payload = p;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;

    // Bridge: user → phone → all agent rows
    const [userRow] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, String(payload.id)))
      .limit(1);

    if (!userRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const agentRows = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.phone, userRow.phone));

    if (agentRows.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agentIds = agentRows.map((a) => a.id);

    // Verify ownership
    const [prop] = await db
      .select({ agentId: properties.agentId })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!prop) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!agentIds.includes(prop.agentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete units first (FK), then property
    await db.delete(propertyUnits).where(eq(propertyUnits.propertyId, id));
    await db.delete(properties).where(eq(properties.id, id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/properties/[id]]", e);
    return NextResponse.json({ error: "Server error", detail: String(e) }, { status: 500 });
  }
}