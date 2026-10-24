import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, properties, propertyUnits } from "@/db/schema";
import {
  eq, desc, ilike, and, inArray,
  gte, lte, or,
  type SQL,
} from "drizzle-orm";
import type { PropertyUnit } from "@/lib/types";

// ── GET /api/properties ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ── Map-filter params (existing) ──
    const listing  = searchParams.get("listing");
    const region   = searchParams.get("region");
    const type     = searchParams.get("type");
    const q        = searchParams.get("q");
    const beds     = searchParams.get("beds");

    // ── Advanced-search params (new) ──
    const area     = searchParams.get("area");     // text match across city/area/address
    const minPrice = searchParams.get("minPrice"); // GH₵ lower bound (inclusive)
    const maxPrice = searchParams.get("maxPrice"); // GH₵ upper bound (inclusive)

    // ── Build WHERE conditions ────────────────────────────────────────────
    const conditions: SQL[] = [
      eq(properties.isVisible, true) as SQL,
    ];

    // Simple equality / range conditions
    if (listing)  conditions.push(eq(properties.listingType,  listing)         as SQL);
    if (region)   conditions.push(eq(properties.region,       region)          as SQL);
    if (type)     conditions.push(eq(properties.propertyType, type)            as SQL);
    if (beds)     conditions.push(gte(properties.bedrooms,    Number(beds))    as SQL);
    if (minPrice) conditions.push(gte(properties.price,       Number(minPrice)) as SQL);

    // maxPrice — if only maxPrice is given (no minPrice), search from 0 up to maxPrice
    if (maxPrice) conditions.push(lte(properties.price, Number(maxPrice))      as SQL);

    // Title text search (original `q` param)
    if (q) conditions.push(ilike(properties.title, `%${q}%`) as SQL);

    // Area text search — matches any of: area, city, address, region, title
    if (area) {
      const pat = `%${area}%`;
      conditions.push(
        or(
          ilike(properties.area,    pat),
          ilike(properties.city,    pat),
          ilike(properties.address, pat),
          ilike(properties.region,  pat),
          ilike(properties.title,   pat),
        ) as SQL
      );
    }

    // ── Full select with agent LEFT JOIN ──────────────────────────────────
    const rows = await db
      .select({
        id:            properties.id,
        title:         properties.title,
        listingType:   properties.listingType,
        propertyType:  properties.propertyType,
        price:         properties.price,
        pricePeriod:   properties.pricePeriod,
        region:        properties.region,
        city:          properties.city,
        area:          properties.area,
        address:       properties.address,
        lat:           properties.lat,
        lng:           properties.lng,
        description:   properties.description,
        beds:          properties.bedrooms,
        baths:         properties.bathrooms,
        halls:         properties.halls,
        amenities:     properties.amenities,
        images:        properties.images,
        viewingDays:   properties.viewingDays,
        viewingTime:   properties.viewingTime,
        isCompound:    properties.isCompound,
        isVisible:     properties.isVisible,
        agentId:       properties.agentId,
        createdAt:     properties.createdAt,
        // agent fields via LEFT JOIN
        agentName:     agents.name,
        agentPhone:    agents.phone,
        agentWhatsApp: agents.whatsapp,
      })
      .from(properties)
      .leftJoin(agents, eq(properties.agentId, agents.id))
      .where(and(...conditions))
      .orderBy(desc(properties.createdAt))
      .limit(500);

    // ── Fetch units for compound properties ──────────────────────────────
    const compoundIds = rows
      .filter((r) => r.isCompound)
      .map((r) => r.id);

    let unitsMap: Record<string, PropertyUnit[]> = {};

    if (compoundIds.length > 0) {
      const unitRows = await db
        .select({
          id:          propertyUnits.id,
          propertyId:  propertyUnits.propertyId,
          unitType:    propertyUnits.unitType,
          bedrooms:    propertyUnits.bedrooms,
          bathrooms:   propertyUnits.bathrooms,
          halls:       propertyUnits.halls,
          price:       propertyUnits.price,
          pricePeriod: propertyUnits.pricePeriod,
          description: propertyUnits.description,
          position:    propertyUnits.position,
          quantity:    propertyUnits.quantity,
          isVisible:   propertyUnits.isVisible,
        })
        .from(propertyUnits)
        .where(
          and(
            inArray(propertyUnits.propertyId, compoundIds),
            eq(propertyUnits.isVisible, true),   // only surface visible units
          )
        )
        .orderBy(propertyUnits.position);

      for (const u of unitRows) {
        if (!unitsMap[u.propertyId]) unitsMap[u.propertyId] = [];
        unitsMap[u.propertyId].push({
          id:          u.id,
          propertyId:  u.propertyId,
          unitType:    u.unitType,
          bedrooms:    u.bedrooms   ?? 0,
          bathrooms:   u.bathrooms  ?? 0,
          halls:       u.halls      ?? 0,
          price:       u.price,
          pricePeriod: u.pricePeriod ?? "month",
          available:   true,
          description: u.description ?? null,
          position:    u.position    ?? 0,
          quantity:    u.quantity    ?? 1,
          isVisible:   u.isVisible   ?? true,
        });
      }
    }

    // ── Shape response to match PropertyListItem ──────────────────────────
    const result = rows.map((r) => ({
      id:            r.id,
      title:         r.title,
      listingType:   r.listingType,
      propertyType:  r.propertyType,
      price:         r.price,
      pricePeriod:   r.pricePeriod,
      region:        r.region,
      city:          r.city          ?? "",
      area:          r.area          ?? "",
      address:       r.address       ?? "",
      lat:           r.lat,
      lng:           r.lng,
      description:   r.description   ?? "",
      beds:          r.beds          ?? 0,
      baths:         r.baths         ?? 0,
      halls:         r.halls         ?? 0,
      amenities:     r.amenities     ?? [],
      photos:        r.images        ?? [],   // sheet reads `photos`
      images:        r.images        ?? [],   // keep both for safety
      viewingDays:   r.viewingDays   ?? [],
      viewingTime:   r.viewingTime   ?? "By appointment",
      isCompound:    r.isCompound,
      isVisible:     r.isVisible,
      agentId:       r.agentId,
      agentName:     r.agentName     ?? "",
      agentPhone:    r.agentPhone    ?? "",
      agentWhatsApp: r.agentWhatsApp ?? null,
      createdAt:     r.createdAt.toISOString(),
      units:         unitsMap[r.id]  ?? [],
      scenes:        [],
    }));

    return NextResponse.json({ properties: result });
  } catch (e) {
    console.error("[GET /api/properties]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}