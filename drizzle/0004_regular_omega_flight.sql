CREATE TABLE `paymentLinkLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`printJobId` int NOT NULL,
	`shopId` int NOT NULL,
	`vpaUsed` varchar(192) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`pickupCode` varchar(6) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentLinkLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `printJobs` ADD `pickupCode` varchar(6);--> statement-breakpoint
ALTER TABLE `printJobs` ADD `accessTokenHash` varchar(64);--> statement-breakpoint
ALTER TABLE `printJobs` ADD `openedAt` timestamp;--> statement-breakpoint
ALTER TABLE `printJobs` ADD `paymentMethod` enum('cash','upi') DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `printJobs` ADD `paymentStatus` enum('unpaid','upi_sent','paid') DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `printJobs` ADD `paymentAmount` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `printJobs` ADD `upiReferenceLast4` varchar(4);--> statement-breakpoint
ALTER TABLE `shops` ADD `upiVpa` varchar(192);--> statement-breakpoint
ALTER TABLE `shops` ADD `upiOwnerConfirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `print_jobs_pickup_code_unique` UNIQUE(`pickupCode`);--> statement-breakpoint
ALTER TABLE `paymentLinkLogs` ADD CONSTRAINT `paymentLinkLogs_printJobId_printJobs_id_fk` FOREIGN KEY (`printJobId`) REFERENCES `printJobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentLinkLogs` ADD CONSTRAINT `paymentLinkLogs_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_link_job_created_idx` ON `paymentLinkLogs` (`printJobId`,`createdAt`);