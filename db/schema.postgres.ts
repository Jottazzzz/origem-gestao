import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const partyTypeEnum = pgEnum("party_type", ["company", "person"]);
export const contractStatusEnum = pgEnum("contract_status", ["draft", "active", "ended", "archived"]);

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  partyType: partyTypeEnum("party_type").notNull(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  document: text("document").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  cep: text("cep").notNull(),
  street: text("street").notNull(),
  streetNumber: text("street_number").notNull(),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("Brasil"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  placeId: text("place_id"),
  contractType: text("contract_type").notNull(),
  title: text("title").notNull(),
  object: text("object").notNull(),
  startDate: timestamp("start_date", { withTimezone: false, mode: "string" }).notNull(),
  endDate: timestamp("end_date", { withTimezone: false, mode: "string" }).notNull(),
  monthlyValueCents: integer("monthly_value_cents").notNull(),
  paymentTerms: text("payment_terms").notNull(),
  collectionFrequency: text("collection_frequency").notNull(),
  containerType: text("container_type").notNull().default("Baldão"),
  drumQuantity: integer("drum_quantity").notNull(),
  responsible: text("responsible").notNull(),
  notes: text("notes"),
  status: contractStatusEnum("status").notNull().default("draft"),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("idx_contracts_status_end_date_pg").on(table.status, table.endDate),
  index("idx_contracts_legal_name_pg").on(table.legalName),
  index("idx_contracts_document_pg").on(table.document),
]);

export const contractEvents = pgTable("contract_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  actor: text("actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("idx_contract_events_contract_created_pg").on(table.contractId, table.createdAt),
]);
