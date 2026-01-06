import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  publicKey: text("public_key"), // JSON string or PEM encoded public key
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
