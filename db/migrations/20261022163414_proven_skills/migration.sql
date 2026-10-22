ALTER TABLE `evidence` ADD `kind` text;--> statement-breakpoint
ALTER TABLE `evidence` ADD `by_whom` text;--> statement-breakpoint
ALTER TABLE `evidence` ADD `result` text;--> statement-breakpoint
ALTER TABLE `evidence` ADD `course_id` text;--> statement-breakpoint
-- Before kinds existed, finishing a book could record it as evidence. Reading is learning, not proof.
UPDATE `evidence` SET `kind` = 'learned' WHERE `kind` IS NULL AND `title` LIKE 'Read “%';--> statement-breakpoint
-- Skills gain proof-level fields, and the old self-assessed level becomes optional: skills added from
-- now on have none. SQLite can only drop NOT NULL by rebuilding the table; every row is copied.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_skills` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`category` text,
	`type` text DEFAULT 'tool' NOT NULL,
	`focus` text DEFAULT 'keep' NOT NULL,
	`listed` integer DEFAULT false NOT NULL,
	`bar` text,
	`level` text,
	`confidence` integer,
	`last_practiced_at` text,
	`years_experience` real,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_skills`(`id`, `name`, `category`, `level`, `confidence`, `last_practiced_at`, `years_experience`, `notes`, `created_at`, `updated_at`) SELECT `id`, `name`, `category`, `level`, `confidence`, `last_practiced_at`, `years_experience`, `notes`, `created_at`, `updated_at` FROM `skills`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
ALTER TABLE `__new_skills` RENAME TO `skills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
