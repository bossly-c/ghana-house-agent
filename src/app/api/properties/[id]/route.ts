import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, properties, propertyUnits } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Increment views
    await db
      .update(properties)
      .set({ views: (row.properties.views ?? 0) + 1 })
      .where(eq(properties.id, id));

    // Fetch units if compound
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