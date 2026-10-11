ALTER TABLE `paymentLinkLogs` MODIFY COLUMN `pickupCode` varchar(6);--> statement-breakpoint
ALTER TABLE `printJobs` MODIFY COLUMN `pickupCode` varchar(6);--> statement-breakpoint
ALTER TABLE `printJobs` MODIFY COLUMN `accessTokenHash` varchar(64);