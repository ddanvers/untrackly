import { eq } from "drizzle-orm";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { user } = event.context;

  if (!user || user.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing user ID",
    });
  }

  const userId = Number(id);

  // Prevent admin from deleting themselves
  if (userId === user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cannot delete yourself",
    });
  }

  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
});
