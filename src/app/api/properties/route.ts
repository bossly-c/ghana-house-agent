import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, properties, propertyUnits } from "@/db/schema";
import { eq, desc, ilike, and } from "drizzle-orm";

// ── GET /api/properties ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listing = searchParams.get("listing");
    const region  = searchParams.get("region");
    const type    = searchParams.get("type");
    const q       = searchParams.get("q");

    const conditions = [];
    if (listing) conditions.push(eq(properties.listingType, listing));
    if (region)  conditions.push(eq(properties.region, region));
    if (type)    conditions.push(eq(properties.propertyType, type));
    if (q)       conditions.push(ilike(properties.title, `%${q}%`));

    const rows = await db
      .select({
        id:           properties.id,
        title:        properties.title,
        listingType:  properties.listingType,
        propertyType: properties.propertyType,
        price:        properties.price,
        pricePeriod:  properties.pricePeriod,
        region:       properties.region,
        city:         properties.city,
        area:         properties.area,
        lat:          properties.lat,
        lng:          properties.lng,
        images:       properties.images,
        isCompound:   properties.isCompound,
      })
      .from(properties)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(properties.createdAt))
      .limit(500);

    return NextResponse.json({ properties: rows });
  } catch (e) {
    console.error("[GET /api/properties]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/properties ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title, listingType, propertyType,
      price, pricePeriod,
      region, city, area, address,
      lat, lng, description,
      bedrooms, halls, kitchens, bathrooms, toilets, balconies, floorSize,
      amenities, images, viewingDays, viewingTime,
      ownerName, ownerPhone, ownerWhatsapp,
      // compound fields
      isCompound = false,
      units = [],
    } = body;

    // Basic validation
    if (!title || !listingType || !propertyType || !price || !region || !city || !area || !lat || !lng || !ownerName || !ownerPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["rent", "sale"].includes(listingType)) {
      return NextResponse.json({ error: "Invalid listingType" }, { status: 400 });
    }

    // Validate units if compound
    if (isCompound && (!Array.isArray(units) || units.length < 2)) {
      return NextResponse.json(
        { error: "Compound listings must have at least 2 unit types" },
        { status: 400 }
      );
    }

    // Upsert agent
    const [agent] = await db
      .insert(agents)
      .values({
        name:     ownerName,
        phone:    ownerPhone,
        whatsapp: ownerWhatsapp ?? null,
      })
      .returning();

    // For compounds, price = lowest unit price
    const effectivePrice = isCompound && units.length > 0
      ? Math.min(...units.map((u: { price: number }) => Number(u.price)))
      : Number(price);

    // Insert property
    const [property] = await db
      .insert(properties)
      .values({
        agentId:      agent.id,
        title:        title.trim(),
        listingType,
        propertyType,
        price:        effectivePrice,
        pricePeriod:  listingType === "sale" ? "total" : (pricePeriod ?? "month"),
        isCompound,
        region,
        city:         city.trim(),
        area:         area.trim(),
        address:      address?.trim() ?? null,
        lat:          Number(lat),
        lng:          Number(lng),
        description:  description?.trim() ?? "",
        bedrooms:     Number(bedrooms ?? 0),
        halls:        Number(halls ?? 0),
        kitchens:     Number(kitchens ?? 0),
        bathrooms:    Number(bathrooms ?? 0),
        toilets:      Number(toilets ?? 0),
        balconies:    Number(balconies ?? 0),
        floorSize:    floorSize ? Number(floorSize) : null,
        amenities:    Array.isArray(amenities) ? amenities : [],
        images:       Array.isArray(images)
                        ? images.filter((u: string) => u.startsWith("http"))
                        : [],
        viewingDays:  Array.isArray(viewingDays) ? viewingDays : [],
        viewingTime:  viewingTime?.trim() ?? "9:00 AM - 4:00 PM",
      })
      .returning();

    // Insert units if compound
    if (isCompound && units.length > 0) {
      await db.insert(propertyUnits).values(
        units.map((u: {
          unitType: string;
          bedrooms?: number;
          bathrooms?: number;
          halls?: number;
          price: number;
          pricePeriod?: string;
          description?: string;
        }, i: number) => ({
          propertyId:  property.id,
          unitType:    u.unitType,
          bedrooms:    Number(u.bedrooms ?? 0),
          bathrooms:   Number(u.bathrooms ?? 0),
          halls:       Number(u.halls ?? 0),
          price:       Number(u.price),
          pricePeriod: listingType === "sale" ? "total" : (u.pricePeriod ?? "month"),
          description: u.description?.trim() ?? null,
          position:    i,
        }))
      );
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/properties]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}