CREATE TABLE `pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`serviceKey` varchar(48) NOT NULL,
	`label` varchar(120) NOT NULL,
	`unit` varchar(48) NOT NULL DEFAULT 'per page',
	`price` decimal(8,2) NOT NULL DEFAULT '0.00',
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `pricing_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_shop_service_unique` UNIQUE(`shopId`,`serviceKey`)
);
--> statement-breakpoint
CREATE TABLE `printJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`customerCode` varchar(16) NOT NULL,
	`fileKey` varchar(520) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`colour` enum('bw','colour') NOT NULL DEFAULT 'bw',
	`paperSize` enum('A4','A3') NOT NULL DEFAULT 'A4',
	`sides` enum('single','double') NOT NULL DEFAULT 'single',
	`copies` int NOT NULL DEFAULT 1,
	`pageCount` int DEFAULT 0,
	`note` text,
	`status` enum('new','printing','completed','problem') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`deletedAt` timestamp,
	CONSTRAINT `printJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `print_jobs_customer_code_unique` UNIQUE(`customerCode`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(160) NOT NULL DEFAULT 'My print shop',
	`phone` varchar(40),
	`address` text,
	`publicCode` varchar(6) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_owner_user_unique` UNIQUE(`ownerUserId`),
	CONSTRAINT `shops_public_code_unique` UNIQUE(`publicCode`)
);
--> statement-breakpoint
CREATE TABLE `supportRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`shopName` varchar(160) NOT NULL,
	`contact` varchar(200) NOT NULL,
	`category` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`jobCode` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pricing` ADD CONSTRAINT `pricing_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `printJobs_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportRequests` ADD CONSTRAINT `supportRequests_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `print_jobs_shop_created_idx` ON `printJobs` (`shopId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_shop_created_idx` ON `supportRequests` (`shopId`,`createdAt`);