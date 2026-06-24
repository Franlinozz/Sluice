CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`payer` text NOT NULL,
	`rate` text NOT NULL,
	`reserve` text NOT NULL,
	`accrued_ms` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'flowing' NOT NULL,
	`flow_paused` integer DEFAULT false NOT NULL,
	`last_tick_at` integer NOT NULL,
	`heartbeat_at` integer NOT NULL,
	`settled_seconds` integer,
	`settled_amount` text,
	`receipt_id` text,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`stopped_at` integer,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_resource` ON `sessions` (`resource_id`);--> statement-breakpoint
CREATE INDEX `sessions_status` ON `sessions` (`status`);