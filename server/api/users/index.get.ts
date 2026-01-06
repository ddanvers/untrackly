import { defineEventHandler } from "h3";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      publicKey: users.publicKey,
    })
    .from(users);

  return allUsers;
});
