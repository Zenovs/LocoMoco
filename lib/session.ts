import { SignJWT, jwtVerify } from "jose";

// Edge-sicher (nur jose, kein fs/bcrypt) — wird auch in der Middleware genutzt.
export const SESSION_COOKIE = "loco_session";
const ALG = "HS256";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 Tage

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET ist nicht gesetzt.");
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  sub: string; // userId
  username: string;
  name: string;
  role: string;
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ username: p.username, name: p.name, role: p.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      name: String(payload.name),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export function authEnabled(): boolean {
  return process.env.LOCO_AUTH === "1";
}

export function cookieMaxAge(): number {
  return MAX_AGE;
}
