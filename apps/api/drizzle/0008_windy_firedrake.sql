CREATE TABLE `profile_wallets` (
	`wallet` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`linked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `profile_wallets_profile` ON `profile_wallets` (`profile_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`is_public` integer DEFAULT false NOT NULL,
	`ref_by` text,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_handle_unique` ON `profiles` (`handle`);--> statement-breakpoint
ALTER TABLE `research` ADD `profile_id` text;--> statement-breakpoint
ALTER TABLE `resources` ADD `profile_id` text;