CREATE TABLE `citations` (
	`id` text PRIMARY KEY NOT NULL,
	`research_id` text NOT NULL,
	`resource_id` text,
	`resource_name` text NOT NULL,
	`source_url` text,
	`author` text,
	`amount` text NOT NULL,
	`settlement_type` text NOT NULL,
	`tx_hash` text,
	`splitter_address` text,
	`splits` text,
	`marker` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`research_id`) REFERENCES `research`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `citations_research` ON `citations` (`research_id`);--> statement-breakpoint
CREATE INDEX `citations_resource` ON `citations` (`resource_id`);--> statement-breakpoint
CREATE TABLE `feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_url` text NOT NULL,
	`title` text,
	`item_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_feed_url_unique` ON `feeds` (`feed_url`);--> statement-breakpoint
CREATE TABLE `research` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`mode` text DEFAULT 'mock' NOT NULL,
	`citation_count` integer DEFAULT 0 NOT NULL,
	`total_paid` text DEFAULT '0' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `resources` ADD `author` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `content_url` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `source_type` text DEFAULT 'url';--> statement-breakpoint
ALTER TABLE `resources` ADD `splits` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `splitter_address` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `feed_id` text;