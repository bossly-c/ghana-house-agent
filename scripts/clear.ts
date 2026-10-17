// scripts/clear.ts
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("../src/db");
  const { agents, properties, tourScenes, viewingRequests } = await import("../src/db/schema");

  console.log("🗑️  Clearing ALL data from database...");
  await db.delete(viewingRequests);
  await db.delete(tourScenes);
  await db.delete(properties);
  await db.delete(agents);
  console.log("✅ Database is now empty and ready for real data.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});