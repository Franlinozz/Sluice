CREATE TABLE `funding_rounds` (
	`round` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`budget` text,
	`match_total` text,
	`fund_tx` text,
	`distribute_tx` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`settled_at` integer
);
--> statement-breakpoint
CREATE TABLE `funding_tips` (
	`id` text PRIMARY KEY NOT NULL,
	`round` integer DEFAULT 1 NOT NULL,
	`backer` text NOT NULL,
	`creator` text NOT NULL,
	`resource_id` text,
	`label` text,
	`amount` text NOT NULL,
	`weight_bps` integer DEFAULT 10000 NOT NULL,
	`tx` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `funding_tips_round` ON `funding_tips` (`round`);--> statement-breakpoint
CREATE INDEX `funding_tips_creator` ON `funding_tips` (`creator`);