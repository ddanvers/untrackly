import { defineEventHandler, getCookie, getRequestIP, getRequestURL } from "h3";
import { verifyToken } from "~~/server/utils/jwt";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const path = url.pathname;

  // Only log API requests, exclude health checks or static assets if any
  if (!path.startsWith("/api/")) {
    return;
  }

  const method = event.method;
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  const timestamp = new Date().toISOString();

  let userLog = "Guest";

  // Try to identify user
  const token = getCookie(event, "auth_token");
  if (token) {
    try {
      // Use verifyToken (safe, compatible with your utility)
      // Note: This adds a slight overhead of verifying twice (once here, once in endpoint/auth middleware)
      // but ensures logs are accurate and not spoofed.
      const payload = await verifyToken(token);
      if (payload) {
        userLog = `User:${payload.username} (${payload.userId})`;
      } else {
        userLog = "InvalidToken";
      }
    } catch (e) {
      userLog = "TokenError";
    }
  }

  console.log(`[${timestamp}] [${method}] ${path} - IP:${ip} - ${userLog}`);
});
