-- Add per-project AI provider/model preferences
ALTER TABLE `projects` ADD COLUMN `preferred_provider_id` text;--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `preferred_model_id` text;
