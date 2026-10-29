CREATE TABLE `bills` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`due_day` integer NOT NULL,
	`category_id` text,
	`wallet_id` text,
	`active` integer DEFAULT true NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`pay_day` integer,
	`wallet_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `money_entries` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`wallet_id` text NOT NULL,
	`category_id` text,
	`bill_id` text,
	`account_id` text,
	`pot_id` text,
	`income_id` text,
	`to_wallet_id` text,
	`to_amount` real,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `money_rates` (
	`id` text PRIMARY KEY,
	`month` text NOT NULL,
	`currency` text NOT NULL,
	`rate` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `money_rates_month_currency_unique` UNIQUE(`month`,`currency`)
);
--> statement-breakpoint
CREATE TABLE `pot_moves` (
	`id` text PRIMARY KEY,
	`pot_id` text NOT NULL,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pots` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`target` real,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`monthly` real,
	`priority` text DEFAULT 'medium' NOT NULL,
	`why` text DEFAULT '' NOT NULL,
	`url` text,
	`wait_until` text,
	`status` text DEFAULT 'saving' NOT NULL,
	`closed_on` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spend_categories` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`monthly_budget` real,
	`position` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`kind` text DEFAULT 'cash' NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`opened_on` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
