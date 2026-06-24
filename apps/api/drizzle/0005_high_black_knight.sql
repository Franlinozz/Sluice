CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`resource_id` text,
	`need` text NOT NULL,
	`provider_wallet` text NOT NULL,
	`beneficiary_wallet` text NOT NULL,
	`agent_id` integer,
	`amount` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`reason` text,
	`approve_tx` text,
	`post_tx` text,
	`resolve_tx` text,
	`feedback_tx` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matches_match_id_unique` ON `matches` (`match_id`);--> statement-breakpoint
CREATE INDEX `matches_provider` ON `matches` (`provider_wallet`);--> statement-breakpoint
CREATE INDEX `matches_status` ON `matches` (`status`);