CREATE TABLE `evidence` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text,
	`skill_id` text,
	`project_id` text,
	`opportunity_id` text,
	`goal_id` text,
	`url` text,
	`date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'other' NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`goal_id` text,
	`project_id` text,
	`opportunity_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`why` text,
	`area_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`start_date` text,
	`target_date` text,
	`success_criteria` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`target_per_week` integer DEFAULT 7 NOT NULL,
	`goal_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `habit_completions` (
	`id` text PRIMARY KEY,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`completed_at` text NOT NULL,
	CONSTRAINT `habit_completions_habit_id_date_unique` UNIQUE(`habit_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`organization` text,
	`url` text,
	`type` text DEFAULT 'other' NOT NULL,
	`stage` text DEFAULT 'saved' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`location` text,
	`remote` integer DEFAULT false NOT NULL,
	`source` text,
	`open_date` text,
	`deadline` text,
	`applied_date` text,
	`decision_date` text,
	`next_event_date` text,
	`next_event_label` text,
	`compensation` text,
	`technology_tags` blob DEFAULT '[]' NOT NULL,
	`resume_id` text,
	`cover_letter_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`problem` text,
	`blurb` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`start_date` text,
	`end_date` text,
	`stack` text DEFAULT '[]' NOT NULL,
	`repository_url` text,
	`demo_url` text,
	`learned` text,
	`challenges` text,
	`architecture_notes` text,
	`goal_ids` text DEFAULT '[]' NOT NULL,
	`skill_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`category` text,
	`level` text DEFAULT 'learning' NOT NULL,
	`confidence` integer,
	`last_practiced_at` text,
	`years_experience` real,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`area_id` text,
	`goal_id` text,
	`project_id` text,
	`opportunity_id` text,
	`scheduled_date` text,
	`due_date` text,
	`estimated_minutes` integer,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`id` text PRIMARY KEY,
	`week_start` text NOT NULL,
	`wins` text DEFAULT '' NOT NULL,
	`progress` text DEFAULT '' NOT NULL,
	`career` text DEFAULT '' NOT NULL,
	`learning` text DEFAULT '' NOT NULL,
	`projects` text DEFAULT '' NOT NULL,
	`problems` text DEFAULT '' NOT NULL,
	`next_week` text DEFAULT '' NOT NULL,
	`energy` integer,
	`focus` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
