CREATE TABLE `accounts` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`url` text,
	`login` text,
	`purpose` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`cost` real,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`cycle` text DEFAULT 'none' NOT NULL,
	`renews_on` text,
	`payment` text,
	`secret_in` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `resources` ADD `pinned` integer DEFAULT false NOT NULL;