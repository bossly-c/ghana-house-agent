// drizzle.config.ts
import { config } from "dotenv";
import { resolve } from "path";
import type { Config } from "drizzle-kit";

// Load .env first (CLI tools don't auto-load it)
config({ path: resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "\n❌ DATABASE_URL is not set!\n" +
    "   Create a .env file at the project root with:\n" +
    "   DATABASE_URL=postgresql://user:password@host:5432/dbname\n"
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;