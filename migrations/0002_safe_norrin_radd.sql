CREATE TABLE `dumps` (
	`id` text PRIMARY KEY NOT NULL,
	`context_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_dumps_context` ON `dumps` (`context_id`);--> statement-breakpoint
CREATE INDEX `idx_dumps_user` ON `dumps` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_dumps_context_created` ON `dumps` (`context_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contexts_user` ON `contexts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_contexts_key` ON `contexts` (`key`);--> statement-breakpoint
CREATE INDEX `idx_contexts_user_key` ON `contexts` (`user_id`,`key`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_date` ON `sessions` (`user_id`,`date`);