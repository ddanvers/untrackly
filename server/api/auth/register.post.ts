import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { createError, defineEventHandler, readBody, setCookie } from "h3";
import { users } from "~~/server/database/schema";
import { db } from "~~/server/utils/db";
import { signToken } from "~~/server/utils/jwt";

export default defineEventHandler(async (event) => {
  const { username, password, displayName, secretKey } = await readBody(event);
  const registerSecretKey = useRuntimeConfig().registerSecretKey;

  if (!username || !password || !secretKey || !displayName) {
    throw createError({
      statusCode: 400,
      statusMessage: "Имя, логин, пароль и секретный ключ обязательны",
    });
  }
  console.log("keys for reg", registerSecretKey, secretKey);
  if (secretKey !== registerSecretKey) {
    throw createError({
      statusCode: 401,
      statusMessage: "Неверный секретный ключ",
    });
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "Пользователь уже существует",
    });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await db.insert(users).values({
    username,
    passwordHash,
    displayName,
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const token = await signToken({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
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
    },
  };
});
