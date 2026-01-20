-- #NP - Provider Credentials: Multiple auth credentials per provider
-- Supports OAuth tokens and API keys with usage tracking and auto-switching

CREATE TABLE `provider_credentials` (
  `id` text PRIMARY KEY NOT NULL,
  `provider_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `auth_type` text NOT NULL,

  -- OAuth fields (encrypted with safeStorage)
  `oauth_token` text,
  `oauth_refresh_token` text,
  `oauth_expires_at` integer,

  -- API Key fields (encrypted with safeStorage)
  `api_key` text,

  -- Status & Usage
  `is_active` integer NOT NULL DEFAULT 1,
  `priority` integer NOT NULL DEFAULT 0,
  `usage_limit_type` text,
  `usage_limit_value` integer,
  `usage_limit_period` text,
  `current_usage` integer NOT NULL DEFAULT 0,
  `usage_reset_at` integer,
  `last_error` text,
  `last_error_at` integer,

  `created_at` integer,
  `updated_at` integer,

  FOREIGN KEY (`provider_id`) REFERENCES `ai_providers`(`id`) ON DELETE CASCADE
);--> statement-breakpoint

-- Index for fast lookup by provider
CREATE INDEX `idx_provider_credentials_provider` ON `provider_credentials`(`provider_id`);--> statement-breakpoint

-- Index for active credentials ordered by priority
CREATE INDEX `idx_provider_credentials_active` ON `provider_credentials`(`provider_id`, `is_active`, `priority`);
