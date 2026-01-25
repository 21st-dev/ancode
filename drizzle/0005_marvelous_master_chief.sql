CREATE INDEX `chats_worktree_path_idx` ON `chats` (`worktree_path`);--> statement-breakpoint
ALTER TABLE `sub_chats` DROP COLUMN `additions`;--> statement-breakpoint
ALTER TABLE `sub_chats` DROP COLUMN `deletions`;--> statement-breakpoint
ALTER TABLE `sub_chats` DROP COLUMN `file_count`;