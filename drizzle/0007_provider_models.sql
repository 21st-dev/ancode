-- Provider Models table: stores models fetched from each provider
CREATE TABLE IF NOT EXISTS `provider_models` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL REFERENCES `ai_providers`(`id`) ON DELETE CASCADE,
	`model_id` text NOT NULL,
	`display_name` text NOT NULL,
	`api_format` text NOT NULL DEFAULT 'openai',
	`capabilities` text,
	`context_length` integer,
	`is_default` integer DEFAULT 0 NOT NULL,
	`is_available` integer DEFAULT 1 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	UNIQUE(`provider_id`, `model_id`)
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_provider_models_provider` ON `provider_models` (`provider_id`);
