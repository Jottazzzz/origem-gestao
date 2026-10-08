import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contractEvents, contracts } from "@/db/schema";
import { apiError, contractWithEvents, inputToValues, toContract } from "@/lib/contract-server";
import { contractInputSchema, contractStatusSchema } from "@/lib/contracts";
import { requireSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireSession(request);
    if (user instanceof Response) return user;
    const { id } = await context.params;
    const contract = await contractWithEvents(id);
    return contract ? Response.json({ contract }) : Response.json({ error: "Contrato não encontrado." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireSession(request);
    if (user instanceof Response) return user;
    const { id } = await context.params;
    const parsed = contractInputSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Revise os campos informados.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const existing = await contractWithEvents(id);
    if (!existing) return Response.json({ error: "Contrato não encontrado." }, { status: 404 });

    const db = getDb();
    const now = new Date().toISOString();
    const values = inputToValues(parsed.data, id, now);
    if (existing.storedStatus === "ended") values.status = "ended";
    if (existing.storedStatus === "archived") values.status = "archived";
    await db.batch([
      db.update(contracts).set({ ...values, id: undefined, createdAt: existing.createdAt }).where(eq(contracts.id, id)),
      db.insert(contractEvents).values({ id: crypto.randomUUID(), contractId: id, type: "updated", description: "Dados do contrato atualizados", actor: user.displayName, createdAt: now }),
    ]);
    const [updated] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return Response.json({ contract: toContract(updated) });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireSession(request);
    if (user instanceof Response) return user;
    const { id } = await context.params;
    const parsed = contractStatusSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Alteração inválida." }, { status: 400 });
    const existing = await contractWithEvents(id);
    if (!existing) return Response.json({ error: "Contrato não encontrado." }, { status: 404 });

    const db = getDb();
    const now = new Date().toISOString();
    await db.batch([
      db.update(contracts).set({ status: parsed.data.status, updatedAt: now }).where(eq(contracts.id, id)),
      db.insert(contractEvents).values({ id: crypto.randomUUID(), contractId: id, type: "status_changed", description: `${parsed.data.reason} — status alterado para ${parsed.data.status}`, actor: user.displayName, createdAt: now }),
    ]);
    const [updated] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return Response.json({ contract: toContract(updated) });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireSession(request);
    if (user instanceof Response) return user;
    if (user.role !== "Administrativo") return Response.json({ error: "Somente o Administrativo pode arquivar contratos." }, { status: 403 });
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({})) as { actor?: string; reason?: string };
    if (!payload.actor?.trim() || !payload.reason?.trim()) return Response.json({ error: "Informe o responsável e o motivo do arquivamento." }, { status: 400 });
    const existing = await contractWithEvents(id);
    if (!existing) return Response.json({ error: "Contrato não encontrado." }, { status: 404 });

    const db = getDb();
    const now = new Date().toISOString();
    await db.batch([
      db.update(contracts).set({ status: "archived", archivedAt: now, updatedAt: now }).where(eq(contracts.id, id)),
      db.insert(contractEvents).values({ id: crypto.randomUUID(), contractId: id, type: "archived", description: payload.reason.trim(), actor: user.displayName, createdAt: now }),
    ]);
    const [archived] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return Response.json({ contract: toContract(archived) });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}
