CREATE TABLE `certificate_settings` (
	`slug` text PRIMARY KEY NOT NULL,
	`settings_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
