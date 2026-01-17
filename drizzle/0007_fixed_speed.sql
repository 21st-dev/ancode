ALTER TABLE `claude_code_settings` ADD `auth_mode` text DEFAULT 'oauth' NOT NULL;--> statement-breakpoint
ALTER TABLE `claude_code_settings` ADD `api_key` text;--> statement-breakpoint
ALTER TABLE `claude_code_settings` ADD `bedrock_region` text DEFAULT 'us-east-1' NOT NULL;