ALTER TABLE `chats` ADD `model_id` text DEFAULT 'sonnet';--> statement-breakpoint
UPDATE `chats` SET `model_id` = 'sonnet' WHERE `model_id` IS NULL;