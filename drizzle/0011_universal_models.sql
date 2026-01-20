-- #P - Universal Models: Models exist across multiple providers
-- BREAKING CHANGE: Drops old provider_models table and creates new models table

-- Backup old table (keep for 1 release cycle)
ALTER TABLE `provider_models` RENAME TO `provider_models_backup`;--> statement-breakpoint

-- Create new universal models table
CREATE TABLE `models` (
  `id` text PRIMARY KEY NOT NULL,
  `model_id` text NOT NULL UNIQUE,
  `display_name` text NOT NULL,

  -- Multi-provider mapping (comma-separated, position-matched)
  -- Example: provider_ids="prov1,prov2,prov3", provider_status="A,D,X"
  `provider_ids` text NOT NULL,
  `provider_status` text NOT NULL,

  -- Model capabilities
  `api_format` text NOT NULL DEFAULT 'openai',
  `version` text,
  `max_context_length` integer,
  `max_output_tokens` integer,
  `default_temperature` real DEFAULT 1.0,
  `supports_vision` integer DEFAULT 0,
  `supports_tools` integer DEFAULT 0,
  `supports_streaming` integer DEFAULT 1,
  `supports_system_prompt` integer DEFAULT 1,

  -- Pricing (per million tokens)
  `pricing_input_per_mtok` real,
  `pricing_output_per_mtok` real,

  -- Extensible JSON fields
  `capabilities` text,
  `tools_config` text,
  `metadata` text,

  `is_default` integer DEFAULT 0,
  `created_at` integer,
  `updated_at` integer
);--> statement-breakpoint

-- Index for finding models (unique model_id already creates index)
CREATE INDEX `idx_models_api_format` ON `models`(`api_format`);--> statement-breakpoint
CREATE INDEX `idx_models_default` ON `models`(`is_default`);
