ALTER TABLE `sub_chats` ADD `model_id` text DEFAULT 'sonnet';--> statement-breakpoint
UPDATE `sub_chats`
SET `model_id` = COALESCE(
  (
    SELECT `model_id`
    FROM `chats`
    WHERE `chats`.`id` = `sub_chats`.`chat_id`
  ),
  `model_id`
);--> statement-breakpoint
UPDATE `sub_chats` SET `model_id` = 'sonnet' WHERE `model_id` IS NULL;
