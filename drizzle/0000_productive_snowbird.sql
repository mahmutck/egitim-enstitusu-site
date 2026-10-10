CREATE TABLE `admin_credentials` (
	`email` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer
);
--> statement-breakpoint
CREATE TABLE `verification_records` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`graduates_json` text DEFAULT '[]' NOT NULL,
	`note` text,
	`certificate_url` text,
	`certificate_label` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
