-- #NP - Add provider-centric columns to ai_providers table
-- Provider is the root of API configuration - endpoints belong HERE, not on models

ALTER TABLE `ai_providers` ADD COLUMN `api_format` text DEFAULT 'openai';--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `provider_type` text DEFAULT 'custom';--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `api_endpoint` text;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `models_endpoint` text;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `auth_endpoint` text;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `supports_streaming` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `requires_user_id` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD COLUMN `metadata` text;
