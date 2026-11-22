CREATE TABLE `certificate_files` (
	`slug` text NOT NULL,
	`name_key` text NOT NULL,
	`display_name` text NOT NULL,
	`original_name` text,
	`pdf_size` integer NOT NULL,
	`has_preview` integer DEFAULT 0 NOT NULL,
	`version` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`slug`, `name_key`)
);
