import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, publicUser, verifyPassword, type SessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { username?: string; password?: string };
  const username = payload.username?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  if (!username || !password) return Response.json({ error: "Informe o usuário e a senha." }, { status: 400 });

  const db = getDb();
  let [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  const bootstrapPassword = typeof env.ADMIN_BOOTSTRAP_PASSWORD === "string" ? env.ADMIN_BOOTSTRAP_PASSWORD : "";
  if (!user && username === "admin" && bootstrapPassword.length >= 16 && password === bootstrapPassword) {
    const now = new Date().toISOString();
    const credentials = await hashPassword(password);
    const created = {
      id: crypto.randomUUID(), username: "admin", displayName: "Administrador",
      role: "Administrativo" as const, passwordHash: credentials.hash, passwordSalt: credentials.salt,
      active: true, mustChangePassword: true, createdAt: now, updatedAt: now,
    };
    await db.insert(users).values(created).onConflictDoNothing();
    [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  }

  if (!user || !user.active || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
    return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const session = await createSession(user.id);
  const responseUser: SessionUser = {
    id: user.id, username: user.username, displayName: user.displayName,
    role: user.role, mustChangePassword: user.mustChangePassword,
  };
  return Response.json({ user: publicUser(responseUser) }, { headers: { "Set-Cookie": session.cookie } });
}
