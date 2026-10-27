CREATE TABLE `task_completions` (
	`id` text PRIMARY KEY,
	`task_id` text NOT NULL,
	`date` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`completed_at` text NOT NULL,
	CONSTRAINT `task_completions_task_id_date_unique` UNIQUE(`task_id`,`date`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `repeat` text;--> statement-breakpoint
ALTER TABLE `events` ADD `skips` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `slots` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `repeat` text;