import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
export const agents = pgTable("agents", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  phone:     text("phone").notNull(),
  whatsapp:  text("whatsapp"),
  avatar:    text("avatar"),
  bio:       text("bio"),
  verified:  boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------
export const properties = pgTable("properties", {
  id:           uuid("id").primaryKey().defaultRandom(),
  agentId:      uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),

  title:        text("title").notNull(),
  listingType:  text("listing_type").notNull(),
  propertyType: text("property_type").notNull(),
  price:        integer("price").notNull(),
  pricePeriod:  text("price_period").notNull().default("month"),

  isCompound:   boolean("is_compound").notNull().default(false),

  region:       text("region").notNull(),
  city:         text("city").notNull(),
  area:         text("area").notNull(),
  address:      text("address"),
  lat:          doublePrecision("lat").notNull(),
  lng:          doublePrecision("lng").notNull(),

  description:  text("description").notNull().default(""),

  bedrooms:     integer("bedrooms").notNull().default(0),
  halls:        integer("halls").notNull().default(0),
  kitchens:     integer("kitchens").notNull().default(0),
  bathrooms:    integer("bathrooms").notNull().default(0),
  toilets:      integer("toilets").notNull().default(0),
  balconies:    integer("balconies").notNull().default(0),
  floorSize:    integer("floor_size"),

  amenities:    text("amenities").array().notNull().default(sql`'{}'::text[]`),
  images:       text("images").array().notNull().default(sql`'{}'::text[]`),

  viewingDays:  text("viewing_days").array().notNull().default(sql`'{}'::text[]`),
  viewingTime:  text("viewing_time").notNull().default("9:00 AM - 4:00 PM"),

  status:       text("status").notNull().default("available"),
  featured:     boolean("featured").notNull().default(false),
  isVisible:    boolean("is_visible").notNull().default(true),   // ✅ ADD THIS LINE
  views:        integer("views").notNull().default(0),

  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Property Units  (for compounds with multiple house types at one location)
// ---------------------------------------------------------------------------
export const propertyUnits = pgTable("property_units", {
  id:          uuid("id").primaryKey().defaultRandom(),
  propertyId:  uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitType:    text("unit_type").notNull(),             // e.g. "Single Room Self-Contain"
  bedrooms:    integer("bedrooms").notNull().default(0),
  bathrooms:   integer("bathrooms").notNull().default(0),
  halls:       integer("halls").notNull().default(0),
  price:       integer("price").notNull(),
  pricePeriod: text("price_period").notNull().default("month"),
  available:   boolean("available").notNull().default(true),
  description: text("description"),
  position:    integer("position").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// 3D Tour Scenes
// ---------------------------------------------------------------------------
export type SceneLink = {
  yaw: number;
  pitch: number;
  toOrder: number;
  label: string;
};

export const tourScenes = pgTable("tour_scenes", {
  id:          uuid("id").primaryKey().defaultRandom(),
  propertyId:  uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  panoUrl:     text("pano_url").notNull(),
  orderIndex:  integer("order_index").notNull().default(0),
  defaultYaw:  doublePrecision("default_yaw").notNull().default(0),
  defaultPitch: doublePrecision("default_pitch").notNull().default(0),
  links:       jsonb("links").notNull().default(sql`'[]'::jsonb`).$type<SceneLink[]>(),
});

// ---------------------------------------------------------------------------
// Viewing Requests
// ---------------------------------------------------------------------------
export const viewingRequests = pgTable("viewing_requests", {
  id:          uuid("id").primaryKey().defaultRandom(),
  propertyId:  uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  phone:       text("phone").notNull(),
  day:         text("day").notNull(),
  note:        text("note"),
  status:      text("status").notNull().default("pending"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name").notNull(),
  phone:         text("phone").notNull(),
  whatsapp:      text("whatsapp").notNull(),
  username:      text("username").notNull().unique(),
  passwordHash:  text("password_hash").notNull(),
  profilePicUrl: text("profile_pic_url"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});