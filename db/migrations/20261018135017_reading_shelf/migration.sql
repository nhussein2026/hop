CREATE TABLE `book_loans` (
	`id` text PRIMARY KEY,
	`book_id` text NOT NULL,
	`library` text NOT NULL,
	`borrowed_on` text NOT NULL,
	`due_on` text NOT NULL,
	`renewed_on` text DEFAULT '[]' NOT NULL,
	`max_renewals` integer,
	`returned_on` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`author` text,
	`pages` integer,
	`language` text,
	`format` text DEFAULT 'paper' NOT NULL,
	`status` text DEFAULT 'want' NOT NULL,
	`why` text DEFAULT '' NOT NULL,
	`suggested_by_id` text,
	`suggested_by` text,
	`topics` text DEFAULT '[]' NOT NULL,
	`skill_ids` text DEFAULT '[]' NOT NULL,
	`goal_id` text,
	`habit_id` text,
	`started_on` text,
	`finished_on` text,
	`rating` integer,
	`takeaways` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reading_log` (
	`id` text PRIMARY KEY,
	`book_id` text NOT NULL,
	`date` text NOT NULL,
	`page` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `reading_log_book_id_date_unique` UNIQUE(`book_id`,`date`)
);
--> statement-breakpoint
ALTER TABLE `finds` ADD `language` text;--> statement-breakpoint
ALTER TABLE `finds` ADD `book_id` text;