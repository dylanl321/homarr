CREATE TABLE `cmdb_resource` (
	`id` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`description` text,
	`tags` text NOT NULL DEFAULT ('[]'),
	`metadata` text NOT NULL DEFAULT ('{}'),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `cmdb_resource_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cmdb_relationship` (
	`id` varchar(64) NOT NULL,
	`source_id` varchar(64) NOT NULL,
	`target_id` varchar(64) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `cmdb_relationship_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cmdb_owner` (
	`id` varchar(64) NOT NULL,
	`resource_id` varchar(64) NOT NULL,
	`owner_type` varchar(32) NOT NULL,
	`owner_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `cmdb_owner_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_trace` (
	`id` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`media_type` varchar(16) NOT NULL,
	`tmdb_id` varchar(64),
	`tvdb_id` varchar(64),
	`imdb_id` varchar(64),
	`status` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `media_trace_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_trace_event` (
	`id` varchar(64) NOT NULL,
	`trace_id` varchar(64) NOT NULL,
	`stage` varchar(32) NOT NULL,
	`integration_id` varchar(64),
	`integration_kind` varchar(64),
	`external_id` varchar(128),
	`title` varchar(512),
	`status` varchar(64),
	`payload` text,
	`occurred_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `media_trace_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cmdb_relationship` ADD CONSTRAINT `cmdb_relationship_source_id_cmdb_resource_id_fk` FOREIGN KEY (`source_id`) REFERENCES `cmdb_resource`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cmdb_relationship` ADD CONSTRAINT `cmdb_relationship_target_id_cmdb_resource_id_fk` FOREIGN KEY (`target_id`) REFERENCES `cmdb_resource`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cmdb_owner` ADD CONSTRAINT `cmdb_owner_resource_id_cmdb_resource_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `cmdb_resource`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_trace_event` ADD CONSTRAINT `media_trace_event_trace_id_media_trace_id_fk` FOREIGN KEY (`trace_id`) REFERENCES `media_trace`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cmdb_relationship_source_idx` ON `cmdb_relationship` (`source_id`);--> statement-breakpoint
CREATE INDEX `cmdb_relationship_target_idx` ON `cmdb_relationship` (`target_id`);--> statement-breakpoint
CREATE INDEX `cmdb_owner_resource_idx` ON `cmdb_owner` (`resource_id`);--> statement-breakpoint
CREATE INDEX `media_trace_event_trace_idx` ON `media_trace_event` (`trace_id`);--> statement-breakpoint
CREATE INDEX `media_trace_tmdb_idx` ON `media_trace` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `media_trace_imdb_idx` ON `media_trace` (`imdb_id`);
