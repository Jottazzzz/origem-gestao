import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contractEvents, contracts } from "@/db/schema";
import { apiError, inputToValues, toContract } from "@/lib/contract-server";
import { contractInputSchema } from "@/lib/contracts";
import { requireSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    if (user instanceof Response) return user;
    const db = getDb();
    const rows = await db.select().from(contracts).orderBy(asc(contracts.endDate), asc(contracts.legalName));
    return Response.json({ contracts: rows.map(toContract) });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession(request);
    if (user instanceof Response) return user;
    const parsed = contractInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Revise os campos informados.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const db = getDb();
    const document = parsed.data.document.replace(/\D/g, "");
    const duplicate = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.document, document), eq(contracts.status, "active"))).limit(1);
    if (duplicate.length) return Response.json({ error: "Já existe um contrato ativo para este CPF/CNPJ." }, { status: 409 });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const values = inputToValues(parsed.data, id, now);
    await db.batch([
      db.insert(contracts).values(values),
      db.insert(contractEvents).values({
        id: crypto.randomUUID(), contractId: id, type: "created",
        description: parsed.data.status === "active" ? "Contrato criado e ativado" : "Contrato salvo como rascunho",
        actor: user.displayName, createdAt: now,
      }),
    ]);
    const [created] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return Response.json({ contract: toContract(created) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}
