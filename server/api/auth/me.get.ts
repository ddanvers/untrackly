import { createError, defineEventHandler, getCookie } from "h3";
import { verifyToken } from "~~/server/utils/jwt";

export default defineEventHandler(async (event) => {
  const authToken = getCookie(event, "auth_token");

  if (!authToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const payload = await verifyToken(authToken);

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired token",
    });
  }

  return {
    user: {
      id: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
    },
  };
});
