import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/db";                   // ✅ correct path
import { properties } from "@/db/schema";    // ✅ correct path
import { eq, desc } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "gha_super_secret_jwt_key_2026"
);

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET);
    const agentId = String(payload.id);

    const rows = await db
      .select({
        id:           properties.id,
        title:        properties.title,
        listingType:  properties.listingType,
        price:        properties.price,
        pricePeriod:  properties.pricePeriod,
        city:         properties.city,
        area:         properties.area,
        region:       properties.region,
        address:      properties.address,
        propertyType: properties.propertyType,
        lat:          properties.lat,
        lng:          properties.lng,
        isVisible:    properties.isVisible,   // ✅ now in schema
        isCompound:   properties.isCompound,
        beds:         properties.bedrooms,
        baths:        properties.bathrooms,
        photos:       properties.images,
        createdAt:    properties.createdAt,
        agentId:      properties.agentId,
      })
      .from(properties)
      .where(eq(properties.agentId, agentId))
      .orderBy(desc(properties.createdAt));

    return NextResponse.json({ properties: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}