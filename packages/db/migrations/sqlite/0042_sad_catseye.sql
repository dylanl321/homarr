CREATE TABLE `cmdb_owner` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `cmdb_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cmdb_owner_resource_idx` ON `cmdb_owner` (`resource_id`);--> statement-breakpoint
CREATE TABLE `cmdb_relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `cmdb_resource`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `cmdb_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cmdb_relationship_source_idx` ON `cmdb_relationship` (`source_id`);--> statement-breakpoint
CREATE INDEX `cmdb_relationship_target_idx` ON `cmdb_relationship` (`target_id`);--> statement-breakpoint
CREATE TABLE `cmdb_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_trace_event` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`stage` text NOT NULL,
	`integration_id` text,
	`integration_kind` text,
	`external_id` text,
	`title` text,
	`status` text,
	`payload` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`trace_id`) REFERENCES `media_trace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_trace_event_trace_idx` ON `media_trace_event` (`trace_id`);--> statement-breakpoint
CREATE TABLE `media_trace` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` text,
	`tvdb_id` text,
	`imdb_id` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_trace_tmdb_idx` ON `media_trace` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `media_trace_imdb_idx` ON `media_trace` (`imdb_id`);