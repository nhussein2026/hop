CREATE TABLE `finds` (
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`source` text DEFAULT '' NOT NULL,
	`why` text NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'inbox' NOT NULL,
	`event_date` text,
	`task_id` text,
	`resource_id` text,
	`idea_id` text,
	`opportunity_id` text,
	`event_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`weight` integer NOT NULL,
	`due` text,
	`time` text,
	`score` real,
	`submitted` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`term_id` text,
	`status` text DEFAULT 'taking' NOT NULL,
	`crn` text,
	`instructor_id` text,
	`credits` real,
	`ects` real,
	`ninova_url` text,
	`schedule` text DEFAULT '[]' NOT NULL,
	`vf` text,
	`absences` integer DEFAULT 0 NOT NULL,
	`target` integer,
	`grade` text,
	`why` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`stage` text DEFAULT 'spark' NOT NULL,
	`question` text DEFAULT '' NOT NULL,
	`why` text DEFAULT '' NOT NULL,
	`next_step` text DEFAULT '' NOT NULL,
	`resource_ids` text DEFAULT '[]' NOT NULL,
	`advisor_ids` text DEFAULT '[]' NOT NULL,
	`course_ids` text DEFAULT '[]' NOT NULL,
	`find_ids` text DEFAULT '[]' NOT NULL,
	`project_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `key_dates` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pins` (
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resource_files` (
	`resource_id` text PRIMARY KEY,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`course_id` text,
	`topics` text DEFAULT '[]' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`source` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uni_links` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `interests` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `playbook` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `course_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `assessment_id` text;