CREATE TABLE IF NOT EXISTS `task_routing` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_type` text NOT NULL UNIQUE,
	`provider_id` text REFERENCES `ai_providers`(`id`) ON DELETE SET NULL,
	`is_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer
);
