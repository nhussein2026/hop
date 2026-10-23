CREATE TABLE `language_checks` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`area` text NOT NULL,
	`task` text DEFAULT '' NOT NULL,
	`metrics` text NOT NULL,
	`level` text,
	`judged_by` text,
	`link` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `language_checks_area_date_idx` ON `language_checks` (`area`,`date`);