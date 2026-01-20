-- #NP - Usage Logs: Track API usage metrics (debug payloads optional)

CREATE TABLE `usage_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `credential_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `model_id` text NOT NULL,

  -- Request metrics (always tracked)
  `request_tokens` integer,
  `response_tokens` integer,
  `total_tokens` integer,
  `request_time_ms` integer,

  -- Cost tracking
  `estimated_cost` real,

  -- Context
  `chat_id` text,
  `sub_chat_id` text,
  `agent_type` text,

  -- Debug mode only (nullable, only populated when debug enabled)
  -- #P - Debug data is sensitive, only store when explicitly enabled
  `request_payload` text,
  `response_payload` text,

  `created_at` integer,

  FOREIGN KEY (`credential_id`) REFERENCES `provider_credentials`(`id`) ON DELETE CASCADE
);--> statement-breakpoint

-- Indexes for fast aggregation queries
CREATE INDEX `idx_usage_logs_credential` ON `usage_logs`(`credential_id`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_usage_logs_provider` ON `usage_logs`(`provider_id`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_usage_logs_model` ON `usage_logs`(`model_id`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_usage_logs_chat` ON `usage_logs`(`chat_id`, `created_at`);
