CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`task` text NOT NULL,
	`budget` text NOT NULL,
	`policy` text,
	`rules` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`resource_id` text,
	`resource_name` text NOT NULL,
	`decision` text NOT NULL,
	`relevance` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`amount` text,
	`paid` integer DEFAULT false NOT NULL,
	`payment_ref` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `decisions_run` ON `decisions` (`run_id`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`spent` text DEFAULT '0' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`steps` integer DEFAULT 0 NOT NULL,
	`mode` text DEFAULT 'mock' NOT NULL,
	`note` text,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `runs_agent` ON `runs` (`agent_id`);