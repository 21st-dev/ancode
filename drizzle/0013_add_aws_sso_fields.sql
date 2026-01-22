-- Add AWS Bedrock SSO fields to claude_code_settings table
ALTER TABLE `claude_code_settings` ADD `bedrock_connection_method` text DEFAULT 'profile';
ALTER TABLE `claude_code_settings` ADD `aws_profile_name` text;
ALTER TABLE `claude_code_settings` ADD `sso_start_url` text;
ALTER TABLE `claude_code_settings` ADD `sso_region` text;
ALTER TABLE `claude_code_settings` ADD `sso_account_id` text;
ALTER TABLE `claude_code_settings` ADD `sso_account_name` text;
ALTER TABLE `claude_code_settings` ADD `sso_role_name` text;
ALTER TABLE `claude_code_settings` ADD `sso_access_token` text;
ALTER TABLE `claude_code_settings` ADD `sso_refresh_token` text;
ALTER TABLE `claude_code_settings` ADD `sso_token_expires_at` integer;
ALTER TABLE `claude_code_settings` ADD `sso_client_id` text;
ALTER TABLE `claude_code_settings` ADD `sso_client_secret` text;
ALTER TABLE `claude_code_settings` ADD `sso_client_expires_at` integer;
ALTER TABLE `claude_code_settings` ADD `aws_access_key_id` text;
ALTER TABLE `claude_code_settings` ADD `aws_secret_access_key` text;
ALTER TABLE `claude_code_settings` ADD `aws_session_token` text;
ALTER TABLE `claude_code_settings` ADD `aws_credentials_expires_at` integer;
