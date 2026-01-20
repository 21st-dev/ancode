-- #NP - Provider Switching Rules: Auto-switch logic for failover and optimization

CREATE TABLE `provider_switching_rules` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `is_enabled` integer NOT NULL DEFAULT 1,
  `priority` integer NOT NULL DEFAULT 0,

  -- Trigger conditions (JSON)
  -- Supported types:
  --   {"type": "usage_exceeded"}
  --   {"type": "error_rate", "threshold": 0.1, "window_minutes": 60}
  --   {"type": "cost_threshold", "max_cost_per_day": 10.0}
  --   {"type": "model_unavailable"}
  --   {"type": "time_based", "schedule": {"start": "09:00", "end": "18:00", "timezone": "UTC"}}
  `trigger_condition` text NOT NULL,

  -- Action
  `action_type` text NOT NULL,
  `target_credential_id` text,
  `target_provider_id` text,
  `target_model_id` text,

  `created_at` integer,

  FOREIGN KEY (`target_credential_id`) REFERENCES `provider_credentials`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`target_provider_id`) REFERENCES `ai_providers`(`id`) ON DELETE SET NULL
);--> statement-breakpoint

-- Index for enabled rules by priority
CREATE INDEX `idx_switching_rules_enabled` ON `provider_switching_rules`(`is_enabled`, `priority`);
