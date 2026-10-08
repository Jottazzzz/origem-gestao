import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contractEvents, contracts } from "@/db/schema";
import { effectiveStatus, type Contract, type ContractInput, type StoredContractStatus } from "@/lib/contracts";

export function toContract(row: typeof contracts.$inferSelect): Contract {
  const storedStatus = row.status as StoredContractStatus;
  return {
    ...row,
    tradeName: row.tradeName ?? null,
    complement: row.complement ?? null,
    notes: row.notes ?? null,
    archivedAt: row.archivedAt ?? null,
    storedStatus,
    status: effectiveStatus(storedStatus, row.endDate),
  };
}

export function inputToValues(input: ContractInput, id: string, now: string): typeof contracts.$inferInsert {
  return {
    id,
    partyType: input.partyType,
    legalName: input.legalName,
    tradeName: input.tradeName || null,
    document: input.document.replace(/\D/g, ""),
    email: input.email.toLowerCase(),
    phone: input.phone.replace(/\D/g, ""),
    cep: input.cep.replace(/\D/g, ""),
    street: input.street,
    streetNumber: input.streetNumber,
    complement: input.complement || null,
    neighborhood: input.neighborhood,
    city: input.city,
    state: input.state.toUpperCase(),
    country: input.country,
    contractType: input.contractType,
    title: input.title,
    object: input.object,
    startDate: input.startDate,
    endDate: input.endDate,
    monthlyValueCents: Math.round(input.monthlyValue * 100),
    paymentTerms: input.paymentTerms,
    collectionFrequency: input.collectionFrequency,
    containerType: input.containerType,
    drumQuantity: input.drumQuantity,
    responsible: input.responsible,
    notes: input.notes || null,
    status: input.status,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function contractWithEvents(id: string) {
  const db = getDb();
  const [row] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!row) return null;
  const events = await db.select().from(contractEvents).where(eq(contractEvents.contractId, id)).orderBy(desc(contractEvents.createdAt));
  return { ...toContract(row), events };
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  if (message.includes("no such table")) return "O banco ainda não recebeu a estrutura de contratos. Publique a migração e tente novamente.";
  if (message.includes("D1 binding")) return "O banco de dados não está disponível neste ambiente.";
  return "Não foi possível concluir a operação. Tente novamente.";
}
