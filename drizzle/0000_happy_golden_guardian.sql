CREATE TABLE `contract_events` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_contract_events_contract_created` ON `contract_events` (`contract_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`party_type` text NOT NULL,
	`legal_name` text NOT NULL,
	`trade_name` text,
	`document` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`cep` text NOT NULL,
	`street` text NOT NULL,
	`street_number` text NOT NULL,
	`complement` text,
	`neighborhood` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`country` text DEFAULT 'Brasil' NOT NULL,
	`latitude` real,
	`longitude` real,
	`place_id` text,
	`contract_type` text NOT NULL,
	`title` text NOT NULL,
	`object` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`monthly_value_cents` integer NOT NULL,
	`payment_terms` text NOT NULL,
	`collection_frequency` text NOT NULL,
	`drum_quantity` integer NOT NULL,
	`responsible` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contracts_status_end_date` ON `contracts` (`status`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_contracts_legal_name` ON `contracts` (`legal_name`);--> statement-breakpoint
CREATE INDEX `idx_contracts_document` ON `contracts` (`document`);--> statement-breakpoint
PRAGMA optimize;
