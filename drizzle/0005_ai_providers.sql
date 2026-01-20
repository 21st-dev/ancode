CREATE TABLE IF NOT EXISTS `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`role` text DEFAULT 'secondary' NOT NULL,
	`is_builtin` integer DEFAULT 0 NOT NULL,
	`api_key` text,
	`base_url` text,
	`created_at` integer
);
