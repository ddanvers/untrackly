import {
  createError,
  defineEventHandler,
  getRequestIP,
  getRequestURL,
} from "h3";

interface RateLimit {
  count: number;
  startTime: number;
  blockedUntil?: number;
}

const rateLimits = new Map<string, RateLimit>();
const WINDOW_MS = 60000; // 1 minute
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const THROTTLE_LIMIT = 100; // Requests per minute before 429
const BAN_LIMIT = 500; // Requests per minute before 403 Ban

// Cleanup interval to remove stale entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimits.entries()) {
    // Keep blocked entries until they expire
    if (data.blockedUntil && data.blockedUntil > now) continue;
    // Remove old entries
    if (now - data.startTime > WINDOW_MS && !data.blockedUntil) {
      rateLimits.delete(ip);
    }
  }
}, 60000);

export default defineEventHandler((event) => {
  const url = getRequestURL(event);

  // Only limit API requests
  if (!url.pathname.startsWith("/api/")) {
    return;
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";

  // Whitelist localhost for development (optional, currently disabled to allow testing)
  // if (ip === "127.0.0.1" || ip === "::1") return;

  const now = Date.now();
  let record = rateLimits.get(ip);

  if (!record) {
    record = { count: 1, startTime: now };
    rateLimits.set(ip, record);
    return;
  }

  // Check if blocked
  if (record.blockedUntil) {
    if (now < record.blockedUntil) {
      throw createError({
        statusCode: 403,
        statusMessage: "IP Blocked due to excessive traffic. Try again later.",
      });
    } else {
      // Block expired, reset
      record.blockedUntil = undefined;
      record.count = 1;
      record.startTime = now;
      return;
    }
  }

  // Check window expiry
  if (now - record.startTime > WINDOW_MS) {
    record.count = 1;
    record.startTime = now;
    return;
  }

  // Increment usage
  record.count++;

  // Check ban threshold
  if (record.count > BAN_LIMIT) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    console.warn(
      `[RateLimiter] Banning IP ${ip} for DDoS behavior (${record.count} reqs)`,
    );
    throw createError({
      statusCode: 403,
      statusMessage: "IP Blocked due to excessive traffic/DDoS behavior.",
    });
  }

  // Check throttle threshold
  if (record.count > THROTTLE_LIMIT) {
    // console.warn(`[RateLimiter] Throttling IP ${ip} (${record.count} reqs)`);
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests. Please slow down.",
    });
  }
});
