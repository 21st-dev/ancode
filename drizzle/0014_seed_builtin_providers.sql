-- #NP - Seed built-in providers and migrate existing data

-- 1. Update existing providers to have provider_type if not set
UPDATE `ai_providers` SET `provider_type` = 'custom' WHERE `provider_type` IS NULL;--> statement-breakpoint

-- 2. Seed built-in providers (if not exists)
INSERT OR IGNORE INTO `ai_providers` (`id`, `name`, `type`, `role`, `is_builtin`, `api_format`, `provider_type`, `api_endpoint`, `models_endpoint`, `created_at`)
VALUES
  ('claude-code-oauth', 'Claude Code', 'anthropic_oauth', 'primary', 1, 'anthropic', 'anthropic', NULL, NULL, unixepoch()),
  ('anthropic-api', 'Anthropic API', 'api_key', 'secondary', 1, 'anthropic', 'anthropic', 'https://api.anthropic.com/v1/messages', NULL, unixepoch()),
  ('openrouter', 'OpenRouter', 'api_key', 'secondary', 1, 'openai', 'openrouter', 'https://openrouter.ai/api/v1/chat/completions', 'https://openrouter.ai/api/v1/models', unixepoch()),
  ('local-ollama', 'Local LLM (Ollama)', 'api_key', 'secondary', 1, 'openai', 'local', 'http://localhost:11434/v1/chat/completions', 'http://localhost:11434/v1/models', unixepoch()),
  ('local-lmstudio', 'Local LLM (LM Studio)', 'api_key', 'secondary', 1, 'openai', 'local', 'http://localhost:1234/v1/chat/completions', 'http://localhost:1234/v1/models', unixepoch());--> statement-breakpoint

-- 3. Migrate existing claude_code_credentials to provider_credentials
INSERT INTO `provider_credentials` (`id`, `provider_id`, `name`, `auth_type`, `oauth_token`, `is_active`, `priority`, `created_at`)
SELECT
  'cred_' || `id`,
  'claude-code-oauth',
  'Claude Code (Migrated)',
  'oauth',
  `oauth_token`,
  1,
  0,
  `connected_at`
FROM `claude_code_credentials`
WHERE NOT EXISTS (SELECT 1 FROM `provider_credentials` WHERE `provider_id` = 'claude-code-oauth');--> statement-breakpoint

-- 4. Migrate existing ai_providers.apiKey to provider_credentials
INSERT INTO `provider_credentials` (`id`, `provider_id`, `name`, `auth_type`, `api_key`, `is_active`, `priority`, `created_at`)
SELECT
  'cred_apikey_' || `id`,
  `id`,
  `name` || ' API Key',
  'api_key',
  `api_key`,
  1,
  0,
  `created_at`
FROM `ai_providers`
WHERE `api_key` IS NOT NULL
AND `id` NOT IN (SELECT `provider_id` FROM `provider_credentials` WHERE `auth_type` = 'api_key');--> statement-breakpoint

-- 5. Migrate existing provider_models_backup to universal models
INSERT INTO `models` (`id`, `model_id`, `display_name`, `provider_ids`, `provider_status`, `api_format`, `capabilities`, `is_default`, `created_at`, `updated_at`)
SELECT
  `id`,
  `model_id`,
  `display_name`,
  `provider_id`,
  'A',
  COALESCE(`api_format`, 'openai'),
  `capabilities`,
  `is_default`,
  `created_at`,
  `updated_at`
FROM `provider_models_backup`
WHERE NOT EXISTS (SELECT 1 FROM `models` WHERE `models`.`model_id` = `provider_models_backup`.`model_id`);
