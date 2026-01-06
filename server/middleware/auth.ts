import { verifyToken } from "~~/server/utils/jwt";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "auth_token");

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      event.context.user = {
        id: payload.userId,
        username: payload.username,
        displayName: payload.displayName,
        role: payload.role,
      };
    }
  }
});
