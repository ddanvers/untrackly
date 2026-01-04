import crypto from "crypto";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const secret = config.turnSecret || process.env.TURN_SECRET;
  const turnUrls = config.public.turnUrl
    ? (config.public.turnUrl as string).split(",")
    : [];

  if (!secret || !turnUrls.length) {
    // Fallback if not configured: return empty array or Google STUN
    return [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ];
  }

  // TTL for credentials (e.g. 24 hours) - standard is usually enough for a session
  const ttl = 24 * 3600;
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:encchat`;

  // HMAC-SHA1 signature
  const mac = crypto.createHmac("sha1", secret);
  mac.setEncoding("base64");
  mac.write(username);
  mac.end();
  const password = mac.read();

  return [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: turnUrls,
      username: username,
      credential: password,
    },
  ];
});
