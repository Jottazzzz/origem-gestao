import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/db";
import { users, userSessions } from "@/db/schema";

export type AppRole = "Gestor" | "Administrativo";
export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: AppRole;
  mustChangePassword: boolean;
};

const COOKIE_NAME = "origem_session";
const SESSION_HOURS = 12;
// Cloudflare Workers Web Crypto currently accepts up to 100,000 PBKDF2 rounds.
const PASSWORD_ITERATIONS = 100_000;

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    salt: bytesToBase64(salt),
    hash: bytesToBase64(await derivePassword(password, salt)),
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const candidate = await derivePassword(password, base64ToBytes(salt));
  const expected = base64ToBytes(expectedHash);
  if (candidate.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < candidate.length; index += 1) difference |= candidate[index] ^ expected[index];
  return difference === 0;
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64(new Uint8Array(digest));
}

function readCookie(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const value = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`));
  return value ? decodeURIComponent(value.slice(COOKIE_NAME.length + 1)) : null;
}

export async function createSession(userId: string) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  await getDb().insert(userSessions).values({
    id: await hashToken(token),
    userId,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
  return {
    token,
    cookie: `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 60 * 60}`,
  };
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request);
  if (!token) return null;
  const sessionId = await hashToken(token);
  const db = getDb();
  const [row] = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    mustChangePassword: users.mustChangePassword,
  }).from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(and(eq(userSessions.id, sessionId), gt(userSessions.expiresAt, new Date().toISOString()), eq(users.active, true)))
    .limit(1);
  return row ?? null;
}

export async function deleteSession(request: Request) {
  const token = readCookie(request);
  if (token) await getDb().delete(userSessions).where(eq(userSessions.id, await hashToken(token)));
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function publicUser(user: SessionUser) {
  return user;
}

export async function requireSession(request: Request) {
  const user = await getSessionUser(request);
  return user ?? Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
}
