import { getSessionUser, publicUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  return user
    ? Response.json({ user: publicUser(user) })
    : Response.json({ error: "Sessão não encontrada." }, { status: 401 });
}
