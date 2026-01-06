ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `identity_public_key`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `ecdh_key_signature`;