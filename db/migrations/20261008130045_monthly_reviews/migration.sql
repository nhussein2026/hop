CREATE TABLE `monthly_reviews` (
	`id` text PRIMARY KEY,
	`month_start` text NOT NULL UNIQUE,
	`highlights` text DEFAULT '' NOT NULL,
	`keep` text DEFAULT '' NOT NULL,
	`stop` text DEFAULT '' NOT NULL,
	`change_note` text DEFAULT '' NOT NULL,
	`focus` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`facts` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
