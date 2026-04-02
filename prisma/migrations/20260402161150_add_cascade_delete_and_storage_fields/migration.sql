-- DropForeignKey
ALTER TABLE `Song` DROP FOREIGN KEY `Song_user_id_fkey`;

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
