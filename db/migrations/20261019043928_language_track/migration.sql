CREATE TABLE `practice_activities` (
	`id` text PRIMARY KEY,
	`area` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`minutes` integer NOT NULL,
	`slot` text DEFAULT 'any' NOT NULL,
	`days` text DEFAULT '[0,1,2,3,4,5,6]' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`area` text NOT NULL,
	`minutes` integer NOT NULL,
	`activity_id` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `practice_sessions_activity_id_date_unique` UNIQUE(`activity_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `practice_tests` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`scores` text NOT NULL,
	`max` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
