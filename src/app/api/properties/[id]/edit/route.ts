import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/db";
import { agents, properties, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "gha_super_secret_jwt_key_2026"
);

export async function PATCH(
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

    // Bridge: user → phone → agent rows
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

    const body = await req.json();

    await db
      .update(properties)
      .set({
        title:        body.title,
        listingType:  body.listingType,
        propertyType: body.propertyType,
        price:        Number(body.price),
        pricePeriod:  body.pricePeriod,
        region:       body.region,
        city:         body.city         ?? "",
        area:         body.area         ?? "",
        address:      body.address      ?? "",
        description:  body.description  ?? "",
        bedrooms:     Number(body.bedrooms)  ?? 0,
        bathrooms:    Number(body.bathrooms) ?? 0,
        halls:        Number(body.halls)     ?? 0,
        isVisible:    body.isVisible,
        viewingDays:  body.viewingDays  ?? [],
        viewingTime:  body.viewingTime  ?? "9:00 AM - 4:00 PM",
      })
      .where(eq(properties.id, id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/properties/[id]/edit]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}