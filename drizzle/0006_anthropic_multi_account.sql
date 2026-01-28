-- Create anthropic_accounts table for multi-account support
CREATE TABLE IF NOT EXISTS `anthropic_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`oauth_token` text NOT NULL,
	`connected_at` integer,
	`last_used_at` integer,
	`desktop_user_id` text
);
--> statement-breakpoint
-- Create anthropic_settings table to track active account
CREATE TABLE IF NOT EXISTS `anthropic_settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`active_account_id` text,
	`updated_at` integer
);
--> statement-breakpoint
-- Migrate existing credential from claude_code_credentials to anthropic_accounts (skip if already migrated)
INSERT OR IGNORE INTO `anthropic_accounts` (`id`, `oauth_token`, `connected_at`, `desktop_user_id`, `display_name`)
SELECT
	'migrated-default',
	`oauth_token`,
	`connected_at`,
	`user_id`,
	'Anthropic Account'
FROM `claude_code_credentials`
WHERE `id` = 'default' AND `oauth_token` IS NOT NULL;
--> statement-breakpoint
-- Set migrated account as active (only if migration inserted a row and settings don't exist)
INSERT OR IGNORE INTO `anthropic_settings` (`id`, `active_account_id`, `updated_at`)
SELECT 'singleton', 'migrated-default', strftime('%s', 'now') * 1000
WHERE EXISTS (SELECT 1 FROM `anthropic_accounts` WHERE `id` = 'migrated-default');
