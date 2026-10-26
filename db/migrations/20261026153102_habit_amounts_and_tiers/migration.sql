ALTER TABLE `habit_completions` ADD `amount` integer;--> statement-breakpoint
ALTER TABLE `habits` ADD `unit` text DEFAULT 'minutes' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `target` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `minimum` integer;--> statement-breakpoint
UPDATE `habits` SET `target` = `minutes`;--> statement-breakpoint
ALTER TABLE `practice_activities` ADD `tier` text DEFAULT 'standard' NOT NULL;