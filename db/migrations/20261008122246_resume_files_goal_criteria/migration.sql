CREATE TABLE `resume_files` (
	`resume_id` text PRIMARY KEY,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
-- Goals are measured only by their criteria. Turn each line of the old free-text success criteria
-- into a criterion, for goals that have none yet. List markers ("-", "*", "•") are dropped.
INSERT INTO `goal_criteria` (`id`, `goal_id`, `text`, `note`, `done`, `position`, `created_at`, `updated_at`)
WITH RECURSIVE `lines` (`goal_id`, `line`, `rest`, `n`) AS (
	SELECT `id`, NULL, replace(`success_criteria`, char(13), '') || char(10), 0
	FROM `goals`
	WHERE trim(coalesce(`success_criteria`, '')) <> '' AND `id` NOT IN (SELECT `goal_id` FROM `goal_criteria`)
	UNION ALL
	SELECT `goal_id`, substr(`rest`, 1, instr(`rest`, char(10)) - 1), substr(`rest`, instr(`rest`, char(10)) + 1), `n` + 1
	FROM `lines`
	WHERE `rest` <> ''
),
`items` AS (
	SELECT `goal_id`, substr(trim(trim(`line`), '-*• '), 1, 160) AS `text`, `n` FROM `lines` WHERE `line` IS NOT NULL
)
SELECT lower(hex(randomblob(16))), `items`.`goal_id`, `items`.`text`, NULL, `goals`.`status` = 'achieved',
	row_number() OVER (PARTITION BY `items`.`goal_id` ORDER BY `items`.`n`) - 1,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `items` JOIN `goals` ON `goals`.`id` = `items`.`goal_id`
WHERE `items`.`text` <> '';
--> statement-breakpoint
-- Progress is always the share of criteria met; a goal without criteria is not measured yet (0).
UPDATE `goals` SET `progress` = coalesce((
	SELECT CAST(round(100.0 * sum(`done`) / count(*)) AS integer) FROM `goal_criteria` WHERE `goal_criteria`.`goal_id` = `goals`.`id`
), 0);
