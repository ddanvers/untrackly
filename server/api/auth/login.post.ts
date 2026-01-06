import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { createError, defineEventHandler, readBody, setCookie } from "h3";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";
import { signToken } from "~~/server/utils/jwt";

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Username and password are required",
    });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  const token = await signToken({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });

  setCookie(event, "auth_token", token, {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24,
    sameSite: "strict",
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  };
});
