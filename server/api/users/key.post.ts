import { eq } from "drizzle-orm";
import { createError, defineEventHandler, getCookie, readBody } from "h3";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";
import { verifyToken } from "~~/server/utils/jwt";

export default defineEventHandler(async (event) => {
  const authToken = getCookie(event, "auth_token");
  if (!authToken) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const payload = await verifyToken(authToken);
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired token",
    });
  }

  const { publicKey } = await readBody(event);

  if (!publicKey) {
    throw createError({
      statusCode: 400,
      statusMessage: "Public Key required",
    });
  }

  await db.update(users).set({ publicKey }).where(eq(users.id, payload.userId));

  return { success: true };
});
