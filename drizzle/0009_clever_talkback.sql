DROP TABLE IF EXISTS `anthropic_accounts`;--> statement-breakpoint
DROP TABLE IF EXISTS `anthropic_settings`;--> statement-breakpoint
DROP INDEX IF EXISTS `chats_worktree_path_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chats_project_id_idx` ON `chats` (`project_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chats_updated_at_idx` ON `chats` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `projects_updated_at_idx` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sub_chats_chat_id_idx` ON `sub_chats` (`chat_id`);