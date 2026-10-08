CREATE TABLE `contacts` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`role` text,
	`organization` text,
	`kind` text DEFAULT 'other' NOT NULL,
	`email` text,
	`linkedin` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY,
	`contact_id` text NOT NULL,
	`opportunity_id` text,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goal_criteria` (
	`id` text PRIMARY KEY,
	`goal_id` text NOT NULL,
	`text` text NOT NULL,
	`note` text,
	`done` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goal_progress` (
	`id` text PRIMARY KEY,
	`goal_id` text NOT NULL,
	`date` text NOT NULL,
	`progress` integer NOT NULL,
	CONSTRAINT `goal_progress_goal_id_date_unique` UNIQUE(`goal_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY,
	`goal_id` text,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunity_activities` (
	`id` text PRIMARY KEY,
	`opportunity_id` text NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunity_prep` (
	`id` text PRIMARY KEY,
	`opportunity_id` text NOT NULL,
	`text` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reflections` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL UNIQUE,
	`accomplished` text DEFAULT '' NOT NULL,
	`learned` text DEFAULT '' NOT NULL,
	`badly` text DEFAULT '' NOT NULL,
	`tomorrow` text DEFAULT '' NOT NULL,
	`energy` integer,
	`focus` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`focus` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `evidence` ADD `skill_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `area` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `days` text DEFAULT '[0,1,2,3,4,5,6]' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `work_mode` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `next_event_time` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `reached_stage` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `contact_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_reviews` ADD `change_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_reviews` ADD `top_three` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_reviews` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_reviews` ADD `facts` text;--> statement-breakpoint
ALTER TABLE `weekly_reviews` ADD `completed_at` text;--> statement-breakpoint
UPDATE `evidence` SET `skill_ids` = json_array(`skill_id`) WHERE `skill_id` IS NOT NULL;--> statement-breakpoint
UPDATE `weekly_reviews` SET `status` = 'completed', `completed_at` = `updated_at`;--> statement-breakpoint
UPDATE `opportunities` SET `reached_stage` = `stage` WHERE `stage` NOT IN ('rejected', 'withdrawn', 'expired', 'accepted', 'declined');--> statement-breakpoint
UPDATE `opportunities` SET `work_mode` = 'remote' WHERE `remote` = 1;
