ALTER TABLE `accounts` ADD `wallet_id` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `auto_logged_on` text;--> statement-breakpoint
ALTER TABLE `money_entries` ADD `auto` integer DEFAULT false NOT NULL;