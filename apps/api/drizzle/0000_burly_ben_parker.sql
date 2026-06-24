CREATE TABLE `accruals` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`payer` text NOT NULL,
	`unit_type` text NOT NULL,
	`units` integer DEFAULT 1 NOT NULL,
	`amount` text NOT NULL,
	`payment_payload` text NOT NULL,
	`nonce` text,
	`status` text DEFAULT 'authorized' NOT NULL,
	`receipt_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`settled_at` integer,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `accruals_payer_resource_status` ON `accruals` (`payer`,`resource_id`,`status`);--> statement-breakpoint
CREATE INDEX `accruals_nonce` ON `accruals` (`nonce`);--> statement-breakpoint
CREATE INDEX `accruals_receipt` ON `accruals` (`receipt_id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`payer` text NOT NULL,
	`unit_type` text NOT NULL,
	`units` integer NOT NULL,
	`rate` text NOT NULL,
	`gross_amount` text NOT NULL,
	`batch_tx_hash` text,
	`backend` text NOT NULL,
	`status` text NOT NULL,
	`raw` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`settled_at` integer,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `receipts_created` ON `receipts` (`created_at`);--> statement-breakpoint
CREATE INDEX `receipts_payer` ON `receipts` (`payer`);--> statement-breakpoint
CREATE INDEX `receipts_resource` ON `receipts` (`resource_id`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit_type` text NOT NULL,
	`unit_price` text NOT NULL,
	`pay_to` text NOT NULL,
	`path` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resources_path_unique` ON `resources` (`path`);