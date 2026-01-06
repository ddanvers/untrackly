import { eq } from "drizzle-orm";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, "id");
  if (!idStr) {
    throw createError({ statusCode: 400, statusMessage: "ID required" });
  }

  const userId = idStr;
  const [user] = await db
    .select({ publicKey: users.publicKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { publicKey: user.publicKey };
});
