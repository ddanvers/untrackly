import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../database/schema";

// Ensure the database file exists or is created
const sqlite = new Database("sqlite.db");
export const db = drizzle(sqlite, { schema });

const migrationsFolder =
  process.env.NODE_ENV === "production"
    ? "./migrations"
    : "./server/database/migrations";

try {
  migrate(db, { migrationsFolder });
  console.log("Database migrations completed successfully.");
} catch (error) {
  console.error("Database migrations failed:", error);
}
