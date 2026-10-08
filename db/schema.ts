import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["Gestor", "Administrativo"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_users_username_unique").on(table.username),
  index("idx_users_role_active").on(table.role, table.active),
]);

export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [
  index("idx_user_sessions_user").on(table.userId),
  index("idx_user_sessions_expires").on(table.expiresAt),
]);

export const contracts = sqliteTable("contracts", {
  id: text("id").primaryKey(),
  partyType: text("party_type", { enum: ["company", "person"] }).notNull(),
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
  latitude: real("latitude"),
  longitude: real("longitude"),
  placeId: text("place_id"),
  contractType: text("contract_type").notNull(),
  title: text("title").notNull(),
  object: text("object").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  monthlyValueCents: integer("monthly_value_cents").notNull(),
  paymentTerms: text("payment_terms").notNull(),
  collectionFrequency: text("collection_frequency").notNull(),
  containerType: text("container_type", { enum: ["Baldinho", "Baldão"] }).notNull().default("Baldão"),
  drumQuantity: integer("drum_quantity").notNull(),
  responsible: text("responsible").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["draft", "active", "ended", "archived"] }).notNull().default("draft"),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_contracts_status_end_date").on(table.status, table.endDate),
  index("idx_contracts_legal_name").on(table.legalName),
  index("idx_contracts_document").on(table.document),
]);

export const contractEvents = sqliteTable("contract_events", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  actor: text("actor").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_contract_events_contract_created").on(table.contractId, table.createdAt),
]);
