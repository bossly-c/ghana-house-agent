import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/db";
import { agents, properties, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "gha_super_secret_jwt_key_2026"
);

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    let payload: any;
    try {
      const result = await jwtVerify(token, SECRET);
      payload = result.payload;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Step 1 — get the logged-in user's phone number
    const [userRow] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, String(payload.id)))
      .limit(1);

    if (!userRow) {
      return NextResponse.json({ properties: [] });
    }

    // Step 2 — find ALL agent rows whose phone matches (there can be duplicates)
    const agentRows = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.phone, userRow.phone));

    if (agentRows.length === 0) {
      return NextResponse.json({ properties: [] });
    }

    const agentIds = agentRows.map((a) => a.id);

    // Step 3 — get all properties belonging to any of those agent rows
    const rows = await db
      .select({
        id:           properties.id,
        title:        properties.title,
        listingType:  properties.listingType,
        price:        properties.price,
        pricePeriod:  properties.pricePeriod,
        city:         properties.city,
        area:         properties.area,
        propertyType: properties.propertyType,
        lat:          properties.lat,
        lng:          properties.lng,
        isVisible:    properties.isVisible,
        images:       properties.images,
        createdAt:    properties.createdAt,
      })
      .from(properties)
      .where(inArray(properties.agentId, agentIds))
      .orderBy(desc(properties.createdAt));

    const result = rows.map((r) => ({
      ...r,
      photos:    (r.images as string[]) ?? [],
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ properties: result });

  } catch (e) {
    console.error("[GET /api/properties/mine]", e);
    return NextResponse.json({ error: "Server error", detail: String(e) }, { status: 500 });
  }
}