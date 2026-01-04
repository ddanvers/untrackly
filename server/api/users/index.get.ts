import { defineEventHandler } from "h3";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";

export default defineEventHandler(async (_event) => {
  // Ideally, this should be protected to authenticated users only.
  // We will assume authentication middleware handles protection or check here if needed.
  // For now, let's just return the list.

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
