// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// During Vercel build, DB isn't needed — only at runtime
// This guard prevents the build from crashing
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === "production") {
  // During build phase on Vercel, DATABASE_URL may not be injected
  // The app will still build — DB only connects at request time
  console.warn("⚠️  DATABASE_URL not set at build time — OK if this is a build step");
}

const globalForDb = globalThis as typeof globalThis & {
  __ghaPostgresPool?: Pool;
};

function createPool() {
  if (!databaseUrl) {
    // Return a dummy pool during build — never actually called
    return null as unknown as Pool;
  }
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  });
}

export const pool =
  globalForDb.__ghaPostgresPool ?? createPool();

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__ghaPostgresPool = pool;
}

export const db = drizzle(pool, { schema });