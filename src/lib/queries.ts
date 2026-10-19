import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agents,
  properties,
  propertyUnits,
  tourScenes,
  viewingRequests,
} from "@/db/schema";
import type {
  ListingType,
  PropertyDetail,
  PropertyFilters,
  PropertyListItem,
  PropertyUnit,
  TourSceneDto,
} from "./types";

type PropertyRow = typeof properties.$inferSelect;
type AgentRow    = typeof agents.$inferSelect;

// ── Map DB row → PropertyListItem ─────────────────────────────────
// PropertyListItem has no agent fields — no join needed for list view
function toListItem(p: PropertyRow): PropertyListItem {
  return {
    id:           p.id,
    listingType:  p.listingType as ListingType,
    propertyType: p.propertyType,
    region:       p.region,
    address:      p.address ?? "",
    area:         p.area,             // ← schema column "area" exists
    city:         p.city,             // ← schema column "city" exists
    title:        p.title,
    lat:          p.lat,
    lng:          p.lng,
    price:        p.price,
    pricePeriod:  p.pricePeriod,
    beds:         p.bedrooms,         // ← schema: "bedrooms" → type: "beds"
    baths:        p.bathrooms,        // ← schema: "bathrooms" → type: "baths"
    photos:       (p.images as string[]) ?? [],  // ← schema column is "images"
    isCompound:   p.isCompound,
    createdAt:    p.createdAt.toISOString(),
  };
}

// ── Map agent row + property row → PropertyDetail agent fields ────
function agentFields(a: AgentRow) {
  return {
    agentName:     a.name,
    agentPhone:    a.phone,
    agentWhatsApp: a.whatsapp ?? null,
  };
}

// ── List properties (map view / filter) ──────────────────────────
export async function listProperties(
  filters: PropertyFilters = {}
): Promise<PropertyListItem[]> {
  const conditions: ReturnType<typeof eq>[] = [];

  // ✅ Always hide invisible properties from the map
  conditions.push(eq(properties.isVisible, true));

  if (filters.listing) {
    conditions.push(eq(properties.listingType, filters.listing));
  }
  if (filters.type) {
    conditions.push(eq(properties.propertyType, filters.type));
  }
  if (filters.region) {
    conditions.push(eq(properties.region, filters.region));
  }
  if (typeof filters.minPrice === "number") {
    conditions.push(gte(properties.price, filters.minPrice));
  }
  if (typeof filters.maxPrice === "number") {
    conditions.push(lte(properties.price, filters.maxPrice));
  }
  if (typeof filters.beds === "number") {
    conditions.push(gte(properties.bedrooms, filters.beds));
  }

  const rows = await db
    .select()
    .from(properties)
    .where(and(...conditions))
    .orderBy(desc(properties.createdAt))
    .limit(500);

  return rows.map(toListItem);
}

// ── Full-text search ──────────────────────────────────────────────
export async function searchProperties(q: string): Promise<PropertyListItem[]> {
  const pattern = `%${q.trim()}%`;
  const rows = await db
    .select()
    .from(properties)
    .where(
      or(
        ilike(properties.title,        pattern),
        ilike(properties.area,         pattern),
        ilike(properties.city,         pattern),
        ilike(properties.region,       pattern),
        ilike(properties.propertyType, pattern)
      )
    )
    .orderBy(desc(properties.createdAt))
    .limit(100);

  return rows.map(toListItem);
}

// ── Single property detail ────────────────────────────────────────
export async function getProperty(id: string): Promise<PropertyDetail | null> {
  // Join agents to get agent contact info
  const rows = await db
    .select({ p: properties, a: agents })
    .from(properties)
    .innerJoin(agents, eq(properties.agentId, agents.id))
    .where(eq(properties.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  const { p, a } = rows[0];

  // increment view counter (fire-and-forget)
  db.update(properties)
    .set({ views: sql`${properties.views} + 1` })
    .where(eq(properties.id, id))
    .catch(() => {});

  // fetch units if compound
  let units: PropertyUnit[] = [];
  if (p.isCompound) {
    const unitRows = await db
      .select()
      .from(propertyUnits)
      .where(eq(propertyUnits.propertyId, id))
      .orderBy(asc(propertyUnits.position));

    units = unitRows.map((u) => ({
      id:          u.id,
      propertyId:  u.propertyId,
      unitType:    u.unitType,
      bedrooms:    u.bedrooms,
      bathrooms:   u.bathrooms,
      halls:       u.halls,
      price:       u.price,
      pricePeriod: u.pricePeriod,
      available:   u.available,
      description: u.description ?? null,
      position:    u.position,
    }));
  }

  // fetch tour scenes
  // ← schema columns: name, orderIndex (not roomName, position)
  const sceneRows = await db
    .select()
    .from(tourScenes)
    .where(eq(tourScenes.propertyId, id))
    .orderBy(asc(tourScenes.orderIndex));

  const scenes: TourSceneDto[] = sceneRows.map((s) => ({
    id:       s.id,
    roomName: s.name,          // ← schema: "name" → type: "roomName"
    panoUrl:  s.panoUrl,
    position: s.orderIndex,    // ← schema: "orderIndex" → type: "position"
  }));

  const photos = (p.images as string[]) ?? [];   // ← schema column is "images"
  const viewingDays = (p.viewingDays as string[]) ?? [];
  const viewingTime = p.viewingTime ?? "08:00 – 18:00";

    return {
    id:           p.id,
    listingType:  p.listingType as ListingType,
    propertyType: p.propertyType,
    region:       p.region,
    address:      p.address ?? "",
    area:         p.area,
    city:         p.city,
    title:        p.title,
    description:  p.description ?? null,
    lat:          p.lat,
    lng:          p.lng,
    beds:         p.bedrooms,
    baths:        p.bathrooms,
    halls:        p.halls,
    price:        p.price,
    pricePeriod:  p.pricePeriod,
    amenities:    (p.amenities as string[]) ?? [],
    photos,
    images:       photos,
    availableDays:  viewingDays,
    availableFrom:  "08:00",
    availableTo:    "18:00",
    viewingDays,
    viewingTime,
    ...agentFields(a),
    views:        p.views,
    isCompound:   p.isCompound,
    isVisible:    p.isVisible,   // ← ADD THIS LINE
    units,
    scenes,
    createdAt:    p.createdAt.toISOString(),
  };
}

// ── Create a viewing request ──────────────────────────────────────
export async function createViewing(input: {
  propertyId: string;
  name:       string;
  phone:      string;
  day:        string;
  note?:      string;
}) {
  const [row] = await db
    .insert(viewingRequests)
    .values({
      propertyId: input.propertyId,
      name:       input.name,
      phone:      input.phone,
      day:        input.day,
      note:       input.note ?? null,
    })
    .returning();
  return row;
}