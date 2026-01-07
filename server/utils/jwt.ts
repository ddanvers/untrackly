import { type JWTPayload, jwtVerify, SignJWT } from "jose";

export interface TokenPayload extends JWTPayload {
  sub: string; // user ID as string (JWT standard)
  userId: string; // actual numeric user ID
  username: string;
  displayName: string;
  role: "user" | "admin";
}

const getSecret = () => {
  const config = useRuntimeConfig();
  const secret = config.jwtSecret || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
};

/**
 * Sign a JWT token with user data
 * @param payload User data to include in token
 * @returns Signed JWT string
 */
export async function signToken(payload: {
  userId: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
}): Promise<string> {
  const secret = getSecret();

  return new SignJWT({
    sub: String(payload.userId),
    userId: payload.userId,
    username: payload.username,
    displayName: payload.displayName,
    role: payload.role,
  } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify and decode a JWT token
 * @param token JWT string to verify
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
