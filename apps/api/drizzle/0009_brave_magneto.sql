CREATE TABLE `faucet_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`wallet` text NOT NULL,
	`amount` text NOT NULL,
	`tx_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `faucet_claims_profile` ON `faucet_claims` (`profile_id`);--> statement-breakpoint
CREATE INDEX `faucet_claims_wallet` ON `faucet_claims` (`wallet`);