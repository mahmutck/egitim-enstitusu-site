CREATE TABLE `certificate_links` (
	`token` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_key` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificate_links_slug_name_key` ON `certificate_links` (`slug`,`name_key`);