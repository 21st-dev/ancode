-- Integration settings for external tool integrations with automatic fallbacks
CREATE TABLE IF NOT EXISTS `integration_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `integration_type` text NOT NULL UNIQUE,
  `enabled` integer DEFAULT 1 NOT NULL,
  `use_external` integer DEFAULT 1 NOT NULL,
  `config` text,
  `created_at` text,
  `updated_at` text
);--> statement-breakpoint

-- Seed default integration settings
INSERT OR IGNORE INTO `integration_settings` (`id`, `integration_type`, `enabled`, `use_external`, `config`, `created_at`, `updated_at`)
VALUES
  ('int_router_default', 'router', 1, 1, NULL, datetime('now'), datetime('now')),
  ('int_auth_default', 'auth', 1, 0, NULL, datetime('now'), datetime('now')),
  ('int_memory_default', 'memory', 1, 1, NULL, datetime('now'), datetime('now')),
  ('int_proxy_default', 'proxy', 0, 0, NULL, datetime('now'), datetime('now'));
