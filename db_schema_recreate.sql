-- ====================================================================
-- DevTracker Database Recreation Script
-- Includes DROP TABLE IF EXISTS and CREATE TABLE queries for all tables
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Drop Tables if Already Exist
-- -----------------------------------------------------
DROP TABLE IF EXISTS `app_configs`;
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `audit_group`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `bug_attachments`;
DROP TABLE IF EXISTS `bug_developer_fix_summary`;
DROP TABLE IF EXISTS `bug_mail_thread`;
DROP TABLE IF EXISTS `bug_mail_threads`;
DROP TABLE IF EXISTS `bug_rejection`;
DROP TABLE IF EXISTS `bug_review`;
DROP TABLE IF EXISTS `bug_tasks`;
DROP TABLE IF EXISTS `bug_workflow_map`;
DROP TABLE IF EXISTS `bugs`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `cr_sprint_task_link`;
DROP TABLE IF EXISTS `cr_timeline_events`;
DROP TABLE IF EXISTS `document_content`;
DROP TABLE IF EXISTS `document_master`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `email_audit_logs`;
DROP TABLE IF EXISTS `flyway_schema_history`;
DROP TABLE IF EXISTS `mfa_backup_codes`;
DROP TABLE IF EXISTS `mfa_trusted_devices`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `oauth2_identity_links`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `quality_risk_history`;
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `report_jobs`;
DROP TABLE IF EXISTS `shedlock`;
DROP TABLE IF EXISTS `sprint_task_dependencies`;
DROP TABLE IF EXISTS `sprint_tasks`;
DROP TABLE IF EXISTS `sprints`;
DROP TABLE IF EXISTS `task_developers`;
DROP TABLE IF EXISTS `task_types`;
DROP TABLE IF EXISTS `task_workflow_history`;
DROP TABLE IF EXISTS `task_workflow_map`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `test_case_tasks`;
DROP TABLE IF EXISTS `test_cases`;
DROP TABLE IF EXISTS `user_notification_preferences`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `workflow_steps`;
DROP TABLE IF EXISTS `workflows`;

-- -----------------------------------------------------
-- Create Tables
-- -----------------------------------------------------

-- Table `users`
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `must_change_password` tinyint(1) DEFAULT '0',
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  `account_locked` tinyint(1) NOT NULL DEFAULT '0',
  `lock_time` datetime DEFAULT NULL,
  `password_reset_required` tinyint(1) NOT NULL DEFAULT '0',
  `temp_password_expires_at` datetime DEFAULT NULL,
  `mfa_enabled` tinyint(1) DEFAULT '0',
  `mfa_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_mfa_verified_at` datetime DEFAULT NULL,
  `failed_mfa_attempts` int DEFAULT '0',
  `mfa_enabled_at` datetime DEFAULT NULL,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `theme` varchar(50) DEFAULT 'dark',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `user_roles`
CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`,`role`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `app_configs`
CREATE TABLE `app_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `config_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `attachments`
CREATE TABLE `attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `data` longblob,
  `entity_id` bigint DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(255) DEFAULT NULL,
  `upload_date` datetime(6) DEFAULT NULL,
  `uploaded_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FKtj5qjndi69v9hltsn7q7ddx8g` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `audit_logs`
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint NOT NULL,
  `field_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by_id` bigint DEFAULT NULL,
  `changed_date` datetime DEFAULT NULL,
  `ip_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `workflows`
CREATE TABLE `workflows` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `workflow_steps`
CREATE TABLE `workflow_steps` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workflow_id` bigint DEFAULT NULL,
  `step_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence` int NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `workflow_steps_ibfk_1` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `sprints`
CREATE TABLE `sprints` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `goal text` NULL,
  `start_date` date NULL,
  `end_date` date NULL,
  `status` varchar(100) NOT NULL DEFAULT 'FUTURE',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `task_types`
CREATE TABLE `task_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `tasks`
CREATE TABLE `tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `jtrack_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_type_id` bigint DEFAULT NULL,
  `branch_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_developer_id` bigint DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `dev_start_date` date DEFAULT NULL,
  `sit_date` date DEFAULT NULL,
  `uat_date` date DEFAULT NULL,
  `preprod_date` date DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `efforts` double DEFAULT NULL,
  `pds` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `git_links` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code_review_comments` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  `workflow_id` bigint DEFAULT NULL,
  `tester_id` bigint DEFAULT NULL,
  `is_in_pool` tinyint(1) DEFAULT '0',
  `in_pool_date` datetime DEFAULT NULL,
  `project` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sprint_id` bigint DEFAULT NULL,
  `branch_creation_date` date DEFAULT NULL,
  `branch_merge_date` date DEFAULT NULL,
  `labels` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `brd_document_id` bigint DEFAULT NULL,
  `changes_requested` tinyint(1) NOT NULL DEFAULT '0',
  `changes_requested_date` datetime DEFAULT NULL,
  `unit_test_doc_url` longtext COLLATE utf8mb4_unicode_ci,
  `unit_test_doc_name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `testing_started_date` datetime DEFAULT NULL,
  `testing_completed_date` datetime DEFAULT NULL,
  `testing_duration` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `testing_comments` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_bugs_raised` int DEFAULT '0',
  `total_retests` int DEFAULT '0',
  `reassignment_reason` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reassignment_date` datetime DEFAULT NULL,
  `previous_tester_id` bigint DEFAULT NULL,
  `reassigned_by_id` bigint DEFAULT NULL,
  `approver_id` bigint DEFAULT NULL,
  `deployment_owner_id` bigint DEFAULT NULL,
  `is_quality_risk` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `jtrack_id` (`jtrack_id`),
  CONSTRAINT `fk_tasks_previous_tester` FOREIGN KEY (`previous_tester_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tasks_reassigned_by` FOREIGN KEY (`reassigned_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`),
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `tasks_ibfk_5` FOREIGN KEY (`tester_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tasks_sprint` FOREIGN KEY (`sprint_id`) REFERENCES `sprints` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_approver` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_deployment_owner` FOREIGN KEY (`deployment_owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bugs`
CREATE TABLE `bugs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bug_task_id` bigint DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raised_by_id` bigint DEFAULT NULL,
  `assigned_developer_id` bigint DEFAULT NULL,
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `severity` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  `workflow_id` bigint DEFAULT NULL,
  `tester_id` bigint DEFAULT NULL,
  `is_in_pool` tinyint(1) DEFAULT '0',
  `in_pool_date` datetime DEFAULT NULL,
  `reason` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `steps_to_reproduce` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expected_result` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actual_result` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_bug_review_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bug_id` (`bug_id`),
  CONSTRAINT `bugs_ibfk_1` FOREIGN KEY (`bug_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugs_ibfk_2` FOREIGN KEY (`raised_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bugs_ibfk_3` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bugs_ibfk_4` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `bugs_ibfk_5` FOREIGN KEY (`tester_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_attachments`
CREATE TABLE `bug_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint NOT NULL,
  `document_id` bigint DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ba_bug` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_mail_thread`
CREATE TABLE `bug_mail_thread` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `flow_type` varchar(255) DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `message_subject` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_mail_threads`
CREATE TABLE `bug_mail_threads` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint NOT NULL,
  `mail_from` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mail_to` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `sent_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `bug_mail_threads_ibfk_1` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_tasks`
CREATE TABLE `bug_tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_type_id` bigint DEFAULT NULL,
  `branch_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_developer_id` bigint DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `workflow_id` bigint DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `efforts` double DEFAULT NULL,
  `pds` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `git_links` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code_review_comments` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `bug_tasks_ibfk_1` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`),
  CONSTRAINT `bug_tasks_ibfk_2` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bug_tasks_ibfk_3` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bug_tasks_ibfk_4` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_workflow_map`
CREATE TABLE `bug_workflow_map` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint NOT NULL,
  `workflow_id` bigint NOT NULL,
  `step_id` bigint NOT NULL,
  `step_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence` int NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `bug_workflow_map_ibfk_1` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bug_workflow_map_ibfk_2` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `bug_workflow_map_ibfk_3` FOREIGN KEY (`step_id`) REFERENCES `workflow_steps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `comments`
CREATE TABLE `comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` bigint DEFAULT NULL,
  `text` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `document_master`
CREATE TABLE `document_master` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint NOT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `extension` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `checksum` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modified_date` datetime DEFAULT NULL,
  `version` int NOT NULL DEFAULT '0',
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  CONSTRAINT `document_master_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `document_content`
CREATE TABLE `document_content` (
  `document_id` bigint NOT NULL,
  `file_data` longblob NOT NULL,
  `data` longblob NOT NULL,
  PRIMARY KEY (`document_id`),
  CONSTRAINT `document_content_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `document_master` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `documents`
CREATE TABLE `documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cr_id` bigint NOT NULL,
  `filename` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` bigint NOT NULL,
  `doc_type` enum('API_DOC','BRD','DESIGN','SUPPORT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_doc_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_doc_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `email_audit_logs`
CREATE TABLE `email_audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `notification_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_to` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_cc` text COLLATE utf8mb4_unicode_ci,
  `subject` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `smtp_message_id` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `failure_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `flyway_schema_history`
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `mfa_backup_codes`
CREATE TABLE `mfa_backup_codes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_mbc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `mfa_trusted_devices`
CREATE TABLE `mfa_trusted_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `label` varchar(100) DEFAULT NULL,
  `ip` varchar(50) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_mtd_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `notifications`
CREATE TABLE `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(1000) DEFAULT NULL,
  `time` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `unread` bit(1) NOT NULL,
  `user_id` bigint NOT NULL,
  `is_pinned` boolean DEFAULT FALSE,
  `snoozed_until` timestamp NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `oauth2_identity_links`
CREATE TABLE `oauth2_identity_links` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `linked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provider_id` (`provider`,`provider_id`),
  CONSTRAINT `fk_oauth2_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `password_reset_tokens`
CREATE TABLE `password_reset_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `expiry_date` datetime(6) NOT NULL,
  `token` varchar(255) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK71lqwbwtklmljk3qlsugr1mig` (`token`),
  UNIQUE KEY `UKla2ts67g4oh2sreayswhox1i6` (`user_id`),
  CONSTRAINT `FKk3ndxg5xp6v7wd4gjyusp15gq` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `refresh_tokens`
CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiry_date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `report_jobs`
CREATE TABLE `report_jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requester_id` bigint NOT NULL,
  `report_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('QUEUED','RUNNING','READY','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'QUEUED',
  `download_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_id` (`job_id`),
  UNIQUE KEY `download_token` (`download_token`),
  CONSTRAINT `fk_report_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `shedlock`
CREATE TABLE `shedlock` (
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lock_until` datetime(3) NOT NULL,
  `locked_at` datetime(3) NOT NULL,
  `locked_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `task_developers`
CREATE TABLE `task_developers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL,
  `developer_id` bigint NOT NULL,
  `branch_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_created_date` date DEFAULT NULL,
  `dev_start_date` date DEFAULT NULL,
  `dev_end_date` date DEFAULT NULL,
  `pr_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commit_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `progress` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `task_developers_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_developers_ibfk_2` FOREIGN KEY (`developer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `task_workflow_history`
CREATE TABLE `task_workflow_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL,
  `from_status` varchar(50) DEFAULT NULL,
  `to_status` varchar(50) NOT NULL,
  `transitioned_by_id` bigint DEFAULT NULL,
  `remarks` text,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_twh_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `task_workflow_map`
CREATE TABLE `task_workflow_map` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL,
  `workflow_id` bigint NOT NULL,
  `step_id` bigint NOT NULL,
  `step_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence` int NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `task_workflow_map_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_workflow_map_ibfk_2` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `task_workflow_map_ibfk_3` FOREIGN KEY (`step_id`) REFERENCES `workflow_steps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `test_case_tasks`
CREATE TABLE `test_case_tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `jtrack_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_developer_id` bigint DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `workflow_id` bigint DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `test_case_tasks_ibfk_1` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `test_case_tasks_ibfk_2` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `test_case_tasks_ibfk_3` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `test_cases`
CREATE TABLE `test_cases` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `test_case_task_id` bigint DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `steps` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expected_result` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `created_date` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `user_notification_preferences`
CREATE TABLE `user_notification_preferences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `sprint_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `bug_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `deployment_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `summary_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `sprint_tasks`
CREATE TABLE `sprint_tasks` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `task_code` VARCHAR(50) NOT NULL UNIQUE,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `sprint_id` BIGINT,
    `story_points` INT,
    `estimated_hours` INT,
    `priority` VARCHAR(50),
    `assigned_developer_id` BIGINT,
    `due_date` DATE,
    `status` VARCHAR(50),
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    `completion_rule` VARCHAR(50) DEFAULT 'KEEP_OPEN',
    CONSTRAINT `fk_st_sprint` FOREIGN KEY (`sprint_id`) REFERENCES `sprints` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_st_developer` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `sprint_task_dependencies`
CREATE TABLE `sprint_task_dependencies` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `task_id` BIGINT NOT NULL,
    `depends_on_task_id` BIGINT NOT NULL,
    `dependency_type` VARCHAR(50) NOT NULL,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_std_task` FOREIGN KEY (`task_id`) REFERENCES `sprint_tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_std_depends` FOREIGN KEY (`depends_on_task_id`) REFERENCES `sprint_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `cr_sprint_task_link`
CREATE TABLE `cr_sprint_task_link` (
    `cr_id` BIGINT NOT NULL,
    `sprint_task_id` BIGINT NOT NULL,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    PRIMARY KEY (`cr_id`, `sprint_task_id`),
    CONSTRAINT `fk_cstl_cr` FOREIGN KEY (`cr_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cstl_task` FOREIGN KEY (`sprint_task_id`) REFERENCES `sprint_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_review`
CREATE TABLE `bug_review` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `cr_id` BIGINT NOT NULL,
    `raised_by_tester_id` BIGINT,
    `proposed_bug_payload` JSON NOT NULL,
    `developer_id` BIGINT,
    `review_status` VARCHAR(50) NOT NULL,
    `current_owner_role` VARCHAR(50) NOT NULL,
    `created_bug_id` BIGINT,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_br_cr` FOREIGN KEY (`cr_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_br_tester` FOREIGN KEY (`raised_by_tester_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_br_developer` FOREIGN KEY (`developer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_br_bug` FOREIGN KEY (`created_bug_id`) REFERENCES `bugs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_rejection`
CREATE TABLE `bug_rejection` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `bug_review_id` BIGINT NOT NULL,
    `justification` TEXT NOT NULL,
    `root_cause` VARCHAR(255),
    `reason` VARCHAR(255),
    `evidence_note` TEXT,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_brej_review` FOREIGN KEY (`bug_review_id`) REFERENCES `bug_review` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `bug_developer_fix_summary`
CREATE TABLE `bug_developer_fix_summary` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `bug_id` BIGINT,
    `cr_id` BIGINT,
    `root_cause_analysis` TEXT NOT NULL,
    `fix_summary` TEXT NOT NULL,
    `files_modified` TEXT,
    `database_changes` TEXT,
    `api_changes` TEXT,
    `additional_notes` TEXT,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_bdfs_bug` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_bdfs_cr` FOREIGN KEY (`cr_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `cr_timeline_events`
CREATE TABLE `cr_timeline_events` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `cr_id` BIGINT NOT NULL,
    `milestone_type` VARCHAR(100) NOT NULL,
    `event_status` VARCHAR(50) NOT NULL,
    `event_date` DATETIME NOT NULL,
    `duration_ms` BIGINT,
    `actor_id` BIGINT,
    `is_restart` TINYINT DEFAULT 0,
    `restart_reason` VARCHAR(1000),
    `superseded_event_id` BIGINT,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_cte_cr` FOREIGN KEY (`cr_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cte_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_cte_superseded` FOREIGN KEY (`superseded_event_id`) REFERENCES `cr_timeline_events` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `audit_group`
CREATE TABLE `audit_group` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `group_key` VARCHAR(100) NOT NULL,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `quality_risk_history`
CREATE TABLE `quality_risk_history` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `cr_id` BIGINT NOT NULL,
    `risk_score DOUBLE NOT NULL,
    `bug_count INT NOT NULL,
    `retest_count INT NOT NULL,
    `rejected_bug_count INT NOT NULL,
    `challenge_rate DOUBLE NOT NULL,
    `threshold_snapshot` JSON,
    `is_at_risk` TINYINT DEFAULT 0,
    `evaluated_at` DATETIME NOT NULL,
    `created_by` VARCHAR(255),
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_by` VARCHAR(255),
    `modified_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version` INT NOT NULL DEFAULT 1,
    `active_flag` TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_qrh_cr` FOREIGN KEY (`cr_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-link bug source review constraint
ALTER TABLE bugs ADD CONSTRAINT `fk_bugs_source_review` FOREIGN KEY (`source_bug_review_id`) REFERENCES `bug_review` (`id`) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
