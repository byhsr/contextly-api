CREATE TABLE `session_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text,
	`content` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_entries_session` ON `session_entries` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_entries_user_created` ON `session_entries` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `scope_id` text;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `content`;