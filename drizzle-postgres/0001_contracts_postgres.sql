CREATE TYPE "party_type" AS ENUM ('company', 'person');
CREATE TYPE "contract_status" AS ENUM ('draft', 'active', 'ended', 'archived');

CREATE TABLE "contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "party_type" "party_type" NOT NULL,
  "legal_name" text NOT NULL,
  "trade_name" text,
  "document" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "cep" text NOT NULL,
  "street" text NOT NULL,
  "street_number" text NOT NULL,
  "complement" text,
  "neighborhood" text NOT NULL,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "country" text DEFAULT 'Brasil' NOT NULL,
  "latitude" numeric(10, 7),
  "longitude" numeric(10, 7),
  "place_id" text,
  "contract_type" text NOT NULL,
  "title" text NOT NULL,
  "object" text NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "monthly_value_cents" integer NOT NULL,
  "payment_terms" text NOT NULL,
  "collection_frequency" text NOT NULL,
  "drum_quantity" integer NOT NULL,
  "responsible" text NOT NULL,
  "notes" text,
  "status" "contract_status" DEFAULT 'draft' NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "contract_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "type" text NOT NULL,
  "description" text NOT NULL,
  "actor" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "contract_events_contract_id_contracts_id_fk"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE cascade
);

CREATE INDEX "idx_contracts_status_end_date_pg" ON "contracts" ("status", "end_date");
CREATE INDEX "idx_contracts_legal_name_pg" ON "contracts" ("legal_name");
CREATE INDEX "idx_contracts_document_pg" ON "contracts" ("document");
CREATE INDEX "idx_contract_events_contract_created_pg" ON "contract_events" ("contract_id", "created_at");

CREATE UNIQUE INDEX "idx_contracts_active_document_unique_pg"
  ON "contracts" ("document")
  WHERE "status" = 'active';
