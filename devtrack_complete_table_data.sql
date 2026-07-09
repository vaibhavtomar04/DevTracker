-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: devtrack
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `app_configs`
--

DROP TABLE IF EXISTS `app_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `config_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_configs`
--

LOCK TABLES `app_configs` WRITE;
/*!40000 ALTER TABLE `app_configs` DISABLE KEYS */;
INSERT INTO `app_configs` VALUES (1,'STATUS_PUSHED_FOR_UAT','UAT_TESTING','Status that pushes task for testing bucket'),(2,'STATUS_UAT_COMPLETED','UAT_COMPLETED','Status when UAT is approved'),(3,'STATUS_REJECTED','IN_PROGRESS','Status when UAT is rejected'),(4,'STATUS_SIT_DEPLOYED','SIT_COMPLETED','Status for SIT deployment section'),(5,'STATUS_UAT_DEPLOYED','UAT_COMPLETED','Status for UAT deployment section'),(6,'STATUS_PROD_READY','CLOSED','Status for Prod deployment section'),(7,'STATUS_CODE_REVIEW','CODE_REVIEW','Status for code review bucket'),(8,'STATUS_PUSHED_FOR_SIT','SIT_TESTING','Status that pushes task for SIT testing bucket'),(9,'STATUS_SIT_COMPLETED','SIT_COMPLETED','Status when SIT is approved'),(10,'SIT_APPROVAL_REQUIRED','true','Flag to enable/disable SIT testing requirement'),(11,'UAT_APPROVAL_REQUIRED','true','Flag to enable/disable UAT testing requirement'),(12,'ms_login_enabled','true','Enable Microsoft Entra ID SSO Sign-In'),(13,'ms_client_id','demo-entra-client-id-devtrack','Microsoft Entra ID Client Application ID'),(14,'ms_tenant_id','common','Microsoft Entra ID Tenant Directory ID'),(15,'mfa_enforcement_policy','OPTIONAL','Enterprise MFA Policy: OPTIONAL, MANDATORY, or DISABLED'),(16,'mfa_trusted_device_days','15','Default trusted device window duration in days'),(17,'mfa_max_failed_attempts','5','Max failed OTP attempts before lockout');
/*!40000 ALTER TABLE `app_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attachments`
--

DROP TABLE IF EXISTS `attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `FKtj5qjndi69v9hltsn7q7ddx8g` (`uploaded_by_id`),
  CONSTRAINT `FKtj5qjndi69v9hltsn7q7ddx8g` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachments`
--

LOCK TABLES `attachments` WRITE;
/*!40000 ALTER TABLE `attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `changed_by_id` (`changed_by_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (120,'USER',1,'login',NULL,'SUCCESS','User logged in successfully',1,'2026-07-01 07:23:18','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_attachments`
--

DROP TABLE IF EXISTS `bug_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint NOT NULL,
  `document_id` bigint DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ba_bug` (`bug_id`),
  CONSTRAINT `fk_ba_bug` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_attachments`
--

LOCK TABLES `bug_attachments` WRITE;
/*!40000 ALTER TABLE `bug_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `bug_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_mail_thread`
--

DROP TABLE IF EXISTS `bug_mail_thread`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_mail_thread` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `flow_type` varchar(255) DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `message_subject` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_mail_thread`
--

LOCK TABLES `bug_mail_thread` WRITE;
/*!40000 ALTER TABLE `bug_mail_thread` DISABLE KEYS */;
/*!40000 ALTER TABLE `bug_mail_thread` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_mail_threads`
--

DROP TABLE IF EXISTS `bug_mail_threads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_mail_threads` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_id` bigint NOT NULL,
  `mail_from` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mail_to` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `sent_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bug_id` (`bug_id`),
  CONSTRAINT `bug_mail_threads_ibfk_1` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_mail_threads`
--

LOCK TABLES `bug_mail_threads` WRITE;
/*!40000 ALTER TABLE `bug_mail_threads` DISABLE KEYS */;
/*!40000 ALTER TABLE `bug_mail_threads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_tasks`
--

DROP TABLE IF EXISTS `bug_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `task_type_id` (`task_type_id`),
  KEY `assigned_developer_id` (`assigned_developer_id`),
  KEY `created_by_id` (`created_by_id`),
  KEY `workflow_id` (`workflow_id`),
  CONSTRAINT `bug_tasks_ibfk_1` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`),
  CONSTRAINT `bug_tasks_ibfk_2` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bug_tasks_ibfk_3` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bug_tasks_ibfk_4` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_tasks`
--

LOCK TABLES `bug_tasks` WRITE;
/*!40000 ALTER TABLE `bug_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `bug_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_workflow_map`
--

DROP TABLE IF EXISTS `bug_workflow_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `bug_id` (`bug_id`),
  KEY `workflow_id` (`workflow_id`),
  KEY `step_id` (`step_id`),
  CONSTRAINT `bug_workflow_map_ibfk_1` FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bug_workflow_map_ibfk_2` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `bug_workflow_map_ibfk_3` FOREIGN KEY (`step_id`) REFERENCES `workflow_steps` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_workflow_map`
--

LOCK TABLES `bug_workflow_map` WRITE;
/*!40000 ALTER TABLE `bug_workflow_map` DISABLE KEYS */;
/*!40000 ALTER TABLE `bug_workflow_map` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bugs`
--

DROP TABLE IF EXISTS `bugs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `bug_id` (`bug_id`),
  KEY `bug_task_id` (`bug_task_id`),
  KEY `raised_by_id` (`raised_by_id`),
  KEY `assigned_developer_id` (`assigned_developer_id`),
  KEY `workflow_id` (`workflow_id`),
  KEY `tester_id` (`tester_id`),
  CONSTRAINT `bugs_ibfk_1` FOREIGN KEY (`bug_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bugs_ibfk_2` FOREIGN KEY (`raised_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bugs_ibfk_3` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bugs_ibfk_4` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `bugs_ibfk_5` FOREIGN KEY (`tester_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bugs`
--

LOCK TABLES `bugs` WRITE;
/*!40000 ALTER TABLE `bugs` DISABLE KEYS */;
/*!40000 ALTER TABLE `bugs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` bigint DEFAULT NULL,
  `text` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_content`
--

DROP TABLE IF EXISTS `document_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_content` (
  `document_id` bigint NOT NULL,
  `file_data` longblob NOT NULL,
  `data` longblob NOT NULL,
  PRIMARY KEY (`document_id`),
  CONSTRAINT `document_content_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `document_master` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_content`
--

LOCK TABLES `document_content` WRITE;
/*!40000 ALTER TABLE `document_content` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_master`
--

DROP TABLE IF EXISTS `document_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `document_master_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_master`
--

LOCK TABLES `document_master` WRITE;
/*!40000 ALTER TABLE `document_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cr_id` bigint NOT NULL COMMENT 'FK to tasks.id (Change Request)',
  `filename` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Validated MIME type',
  `size_bytes` bigint NOT NULL,
  `doc_type` enum('API_DOC','BRD','DESIGN','SUPPORT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL DEFAULT '1' COMMENT 'Auto-incremented per (cr_id, doc_type, filename)',
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint NOT NULL COMMENT 'FK to users.id',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL COMMENT 'FK to users.id',
  PRIMARY KEY (`id`),
  KEY `idx_doc_cr_id` (`cr_id`),
  KEY `idx_doc_cr_doc_type` (`cr_id`,`doc_type`),
  KEY `idx_doc_version` (`cr_id`,`doc_type`,`filename`,`version`),
  KEY `fk_doc_uploaded_by` (`uploaded_by`),
  KEY `fk_doc_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_doc_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_doc_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Document metadata — heavy bytes live in document_content';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_audit_logs`
--

DROP TABLE IF EXISTS `email_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `notification_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_to` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_cc` text COLLATE utf8mb4_unicode_ci,
  `subject` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SENT, FAILED, RETRYING, DISCARDED',
  `smtp_message_id` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `failure_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_type` (`notification_type`),
  KEY `idx_email_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_audit_logs`
--

LOCK TABLES `email_audit_logs` WRITE;
/*!40000 ALTER TABLE `email_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flyway_schema_history`
--

DROP TABLE IF EXISTS `flyway_schema_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flyway_schema_history`
--

LOCK TABLES `flyway_schema_history` WRITE;
/*!40000 ALTER TABLE `flyway_schema_history` DISABLE KEYS */;
INSERT INTO `flyway_schema_history` VALUES (1,'1','init schema','SQL','V1__init_schema.sql',989549013,'root','2026-06-29 06:14:19',1855,1),(2,'2','document storage','SQL','V2__document_storage.sql',-1421958500,'root','2026-06-29 12:35:34',620,1),(3,'3','auth reports upgrade','SQL','V3__auth_reports_upgrade.sql',-629233907,'root','2026-06-29 12:36:17',709,1),(4,'4','email framework tables','SQL','V4__email_framework_tables.sql',608170143,'root','2026-06-29 12:36:17',111,1),(5,'5','enterprise cr workflow bugs','SQL','V5__enterprise_cr_workflow_bugs.sql',787528649,'root','2026-06-29 13:18:24',1384,1),(6,'6','totp mfa enterprise','SQL','V6__totp_mfa_enterprise.sql',123735036,'root','2026-06-29 13:32:48',3198,1),(7,'7','add changes requested flag','SQL','V7__add_changes_requested_flag.sql',155051663,'root','2026-06-30 10:42:24',1552,1),(8,'8','unit test doc fields','SQL','V8__unit_test_doc_fields.sql',608311683,'root','2026-06-30 11:29:23',2026,1),(9,'9','add bug details','SQL','V9__add_bug_details.sql',1572423457,'root','2026-07-01 04:39:39',766,1),(10,'10','tester assignment fields','SQL','V10__tester_assignment_fields.sql',1909809890,'root','2026-07-01 06:34:36',3034,1);
/*!40000 ALTER TABLE `flyway_schema_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mfa_backup_codes`
--

DROP TABLE IF EXISTS `mfa_backup_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mfa_backup_codes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mbc_user` (`user_id`),
  CONSTRAINT `fk_mbc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mfa_backup_codes`
--

LOCK TABLES `mfa_backup_codes` WRITE;
/*!40000 ALTER TABLE `mfa_backup_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `mfa_backup_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mfa_trusted_devices`
--

DROP TABLE IF EXISTS `mfa_trusted_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `fk_mtd_user` (`user_id`),
  CONSTRAINT `fk_mtd_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mfa_trusted_devices`
--

LOCK TABLES `mfa_trusted_devices` WRITE;
/*!40000 ALTER TABLE `mfa_trusted_devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `mfa_trusted_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(1000) DEFAULT NULL,
  `time` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `unread` bit(1) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',5),(2,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',6),(3,'CR status changed from IN_PROGRESS to SIT_DEPLOYED by Alex Jones. Remarks: sit depolyed','Just now','CR CR-424 Status Updated',_binary '',1),(4,'CR status changed from SIT_DEPLOYED to SIT_COMPLETED by Alex Jones. Remarks: sit completed','Just now','CR CR-424 Status Updated',_binary '',1),(5,'CR status changed from SIT_COMPLETED to CODE_REVIEW by Alex Jones. Remarks: Submitted for approval. Git Branch: feature/cr-424, PR: avc','Just now','CR CR-424 Status Updated',_binary '',1),(6,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',5),(7,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',6),(8,'CR status changed from CODE_REVIEW to IN_PROGRESS by Admin User. Remarks: testing request changes functionality','Just now','CR CR-424 Status Updated',_binary '',1),(9,'CR \'[SR] Testing 424\' has been deleted by Alex Jones. Remarks: testinf CR deletion','Just now','CR SR-12 Deleted',_binary '',1),(10,'CR status changed from IN_PROGRESS to SIT_DEPLOYED by Alex Jones. Remarks: deploying to sit','Just now','CR CR-424 Status Updated',_binary '',1),(11,'CR status changed from SIT_DEPLOYED to SIT_COMPLETED by Alex Jones. Remarks: sit completed','Just now','CR CR-424 Status Updated',_binary '',1),(12,'CR status changed from SIT_COMPLETED to CODE_REVIEW by Alex Jones. Remarks: Submitted for approval. Git Branch: feature/cr-424, PR: avc','Just now','CR CR-424 Status Updated',_binary '',1),(13,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',5),(14,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',6),(15,'CR status changed from CODE_REVIEW to IN_PROGRESS by Admin User. Remarks: testing request changes functioanlity','Just now','CR CR-424 Status Updated',_binary '',1),(16,'CR status changed from IN_PROGRESS to SIT_DEPLOYED by Alex Jones. Remarks: sit deployed','Just now','CR CR-424 Status Updated',_binary '',1),(17,'CR status changed from SIT_DEPLOYED to SIT_COMPLETED by Alex Jones. Remarks: sit completed','Just now','CR CR-424 Status Updated',_binary '',1),(18,'CR status changed from SIT_COMPLETED to CODE_REVIEW by Alex Jones. Remarks: Submitted for approval. Git Branch: feature/cr-424, PR: avc','Just now','CR CR-424 Status Updated',_binary '',1),(19,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',5),(20,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',6),(21,'CR has been sent back by Admin/Reviewer: Admin User. Remarks: testing req change flow','Just now','CR CR-424 Sent Back by Admin',_binary '',1),(22,'CR status changed from CHANGES_REQUESTED to SIT_DEPLOYED by Alex Jones. Remarks: made the chanes now testing sit deployment','Just now','CR CR-424 Status Updated',_binary '',1),(23,'CR status changed from SIT_DEPLOYED to SIT_COMPLETED by Alex Jones. Remarks: sir completed','Just now','CR CR-424 Status Updated',_binary '',1),(24,'CR status changed from SIT_COMPLETED to CODE_REVIEW by Alex Jones. Remarks: Submitted for approval. Git Branch: feature/cr-424, PR: avc','Just now','CR CR-424 Status Updated',_binary '',1),(25,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',5),(26,'CR CR-424 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',6),(27,'Code Review Step approved. Status is now CODE_REVIEW_DONE. Remarks: approved','Just now','CR CR-424 Step Approved',_binary '',1),(28,'CR status changed from CODE_REVIEW_DONE to MOVE_TO_UAT by Alex Jones. Remarks: uat mai jaa rha hai ','Just now','CR CR-424 Status Updated',_binary '',1),(29,'CR CR-424 has been moved/deployed to status: MOVE_TO_UAT.','Just now','CR Deployed to MOVE_TO_UAT',_binary '',3),(30,'CR CR-424 has been moved/deployed to status: MOVE_TO_UAT.','Just now','CR Deployed to MOVE_TO_UAT',_binary '',4),(31,'CR status changed from SIT_COMPLETED to CODE_REVIEW by Alex Jones. Remarks: Submitted for approval. Git Branch: 334, PR: 234','Just now','CR DT-105 Status Updated',_binary '',1),(32,'CR DT-105 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',5),(33,'CR DT-105 has been submitted for Code Review by developer.','Just now','New Code Review Pending',_binary '',6),(34,'Code Review Step approved. Status is now CLOSED. Remarks: Approved & Merged branch.','Just now','CR DT-105 Step Approved',_binary '',1),(35,'Code Review Step approved. Status is now CODE_REVIEW_DONE. Remarks: Approved & Merged branch.','Just now','CR DT-106 Step Approved',_binary '',1),(36,'CR status changed from CODE_REVIEW_DONE to MOVE_TO_UAT by Alex Jones. Remarks: pushinh yo uat ','Just now','CR DT-106 Status Updated',_binary '',1),(37,'CR DT-106 has been moved/deployed to status: MOVE_TO_UAT.','Just now','CR Deployed to MOVE_TO_UAT',_binary '',2),(38,'CR DT-106 has been moved/deployed to status: MOVE_TO_UAT.','Just now','CR Deployed to MOVE_TO_UAT',_binary '',3),(39,'CR DT-106 has been moved/deployed to status: MOVE_TO_UAT.','Just now','CR Deployed to MOVE_TO_UAT',_binary '',4),(40,'Bug \'bu test\' has been assigned to you by Sarah Connor. Status: OPEN','Just now','New Bug Assigned: BUG-204',_binary '',1),(41,'You have raised a Bug: \'bu test\'.','Just now','Bug Created: BUG-204',_binary '',2),(42,'Bug \'bug testing\' has been assigned to you by Sarah Connor. Status: OPEN','Just now','New Bug Assigned: BUG-205',_binary '',1),(43,'You have raised a Bug: \'bug testing\'.','Just now','Bug Created: BUG-205',_binary '',2),(44,'CR status changed from BUG_FOUND to UAT_TESTING by Alex Jones. Remarks: resolving bug','Just now','CR DT-107 Status Updated',_binary '',1),(45,'CR DT-107 has been moved/deployed to status: UAT_TESTING.','Just now','CR Deployed to UAT_TESTING',_binary '',2),(46,'CR DT-107 has been moved/deployed to status: UAT_TESTING.','Just now','CR Deployed to UAT_TESTING',_binary '',3),(47,'CR DT-107 has been moved/deployed to status: UAT_TESTING.','Just now','CR Deployed to UAT_TESTING',_binary '',4),(48,'Code Review Step approved. Status is now UAT_COMPLETED. Remarks: testing done','Just now','CR DT-107 Step Approved',_binary '',1),(49,'Bug \'testing bug\' has been assigned to you by Sarah Connor. Status: OPEN','Just now','New Bug Assigned: BUG-206',_binary '',1),(50,'You have raised a Bug: \'testing bug\'.','Just now','Bug Created: BUG-206',_binary '',2),(51,'CR status changed from BUG_FOUND to UAT_TESTING by Alex Jones. Remarks: test again','Just now','CR CR-424 Status Updated',_binary '',1),(52,'CR CR-424 has been moved/deployed to status: UAT_TESTING.','Just now','CR Deployed to UAT_TESTING',_binary '',2),(53,'CR CR-424 has been moved/deployed to status: UAT_TESTING.','Just now','CR Deployed to UAT_TESTING',_binary '',3),(54,'CR CR-424 has been moved/deployed to status: UAT_TESTING.','Just now','CR Deployed to UAT_TESTING',_binary '',4),(55,'Code Review Step approved. Status is now UAT_COMPLETED. Remarks: passed','Just now','CR CR-424 Step Approved',_binary '',1),(56,'CR status changed from MOVE_TO_UAT to TESTING_POOL by Alex Jones. Remarks: sending for testing','Just now','CR DT-106 Status Updated',_binary '',1),(57,'Tester Sarah Connor has self-assigned and started testing for CR DT-106.','Just now','Tester Assigned to CR DT-106',_binary '',1),(58,'Tester Sarah Connor has self-assigned and started testing for CR DT-106.','Just now','Tester Assigned to CR DT-106',_binary '',2),(59,'CR DT-106 testing has passed successfully. Remarks: completed','Just now','Testing Passed for CR DT-106',_binary '',1),(60,'CR DT-106 testing has passed successfully. Remarks: completed','Just now','Testing Passed for CR DT-106',_binary '',2);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `oauth2_identity_links`
--

DROP TABLE IF EXISTS `oauth2_identity_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `oauth2_identity_links` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT 'FK to users.id',
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AZURE_AD',
  `provider_id` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Microsoft OIDC Subject ID / OID',
  `email` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `linked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provider_id` (`provider`,`provider_id`),
  KEY `fk_oauth2_user` (`user_id`),
  CONSTRAINT `fk_oauth2_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `oauth2_identity_links`
--

LOCK TABLES `oauth2_identity_links` WRITE;
/*!40000 ALTER TABLE `oauth2_identity_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `oauth2_identity_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `expiry_date` datetime(6) NOT NULL,
  `token` varchar(255) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK71lqwbwtklmljk3qlsugr1mig` (`token`),
  UNIQUE KEY `UKla2ts67g4oh2sreayswhox1i6` (`user_id`),
  CONSTRAINT `FKk3ndxg5xp6v7wd4gjyusp15gq` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiry_date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=180 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (179,1,'1957a7ba-a5ca-4822-8916-4b5b9eca8bc4','2026-07-08 07:23:18');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_jobs`
--

DROP TABLE IF EXISTS `report_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requester_id` bigint NOT NULL COMMENT 'FK to users.id',
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
  KEY `idx_report_job_id` (`job_id`),
  KEY `idx_report_status` (`status`),
  KEY `fk_report_requester` (`requester_id`),
  CONSTRAINT `fk_report_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_jobs`
--

LOCK TABLES `report_jobs` WRITE;
/*!40000 ALTER TABLE `report_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `report_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shedlock`
--

DROP TABLE IF EXISTS `shedlock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shedlock` (
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lock_until` datetime(3) NOT NULL,
  `locked_at` datetime(3) NOT NULL,
  `locked_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shedlock`
--

LOCK TABLES `shedlock` WRITE;
/*!40000 ALTER TABLE `shedlock` DISABLE KEYS */;
INSERT INTO `shedlock` VALUES ('ReportJobCleanupLock','2026-07-01 07:31:00.074','2026-07-01 07:30:00.074','EC2AMAZ-RHV839I');
/*!40000 ALTER TABLE `shedlock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_developers`
--

DROP TABLE IF EXISTS `task_developers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `task_id` (`task_id`),
  KEY `developer_id` (`developer_id`),
  CONSTRAINT `task_developers_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_developers_ibfk_2` FOREIGN KEY (`developer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_developers`
--

LOCK TABLES `task_developers` WRITE;
/*!40000 ALTER TABLE `task_developers` DISABLE KEYS */;
INSERT INTO `task_developers` VALUES (1,9,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0),(2,9,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `task_developers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_types`
--

DROP TABLE IF EXISTS `task_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_types`
--

LOCK TABLES `task_types` WRITE;
/*!40000 ALTER TABLE `task_types` DISABLE KEYS */;
INSERT INTO `task_types` VALUES (1,'CR','Change Request'),(2,'SR','Service Request'),(3,'FIX','Bug Fix'),(4,'NEW_REQ','New Requirement');
/*!40000 ALTER TABLE `task_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_workflow_history`
--

DROP TABLE IF EXISTS `task_workflow_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_workflow_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL,
  `from_status` varchar(50) DEFAULT NULL,
  `to_status` varchar(50) NOT NULL,
  `transitioned_by_id` bigint DEFAULT NULL,
  `remarks` text,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_twh_task` (`task_id`),
  CONSTRAINT `fk_twh_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_workflow_history`
--

LOCK TABLES `task_workflow_history` WRITE;
/*!40000 ALTER TABLE `task_workflow_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_workflow_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_workflow_map`
--

DROP TABLE IF EXISTS `task_workflow_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `task_id` (`task_id`),
  KEY `workflow_id` (`workflow_id`),
  KEY `step_id` (`step_id`),
  CONSTRAINT `task_workflow_map_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_workflow_map_ibfk_2` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `task_workflow_map_ibfk_3` FOREIGN KEY (`step_id`) REFERENCES `workflow_steps` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_workflow_map`
--

LOCK TABLES `task_workflow_map` WRITE;
/*!40000 ALTER TABLE `task_workflow_map` DISABLE KEYS */;
INSERT INTO `task_workflow_map` VALUES (29,9,1,1,'OPEN','TASK',1,'IN_PROGRESS','2026-06-30 04:29:56','2026-06-30 04:29:56'),(30,9,1,2,'IN_PROGRESS','TASK',2,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(31,9,1,3,'SIT_DEPLOYED','TASK',3,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(32,9,1,4,'SIT_TESTING','TESTING',4,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(33,9,1,5,'SIT_COMPLETED','TASK',5,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(34,9,1,6,'CODE_REVIEW','CODE_REVIEW',6,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(35,9,1,7,'CODE_REVIEW_DONE','TASK',7,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(36,9,1,8,'MOVE_TO_UAT','TASK',8,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(37,9,1,9,'UAT_TESTING','TESTING',9,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(38,9,1,10,'UAT_COMPLETED','TASK',10,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(39,9,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(40,9,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(41,9,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 04:29:56','2026-06-30 04:29:56'),(68,12,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 04:58:49','2026-06-30 04:58:49'),(69,12,1,2,'IN_PROGRESS','TASK',2,'CLOSED','2026-06-30 04:58:49','2026-06-30 04:58:49'),(70,12,1,3,'SIT_DEPLOYED','TASK',3,'CLOSED','2026-06-30 04:58:49','2026-06-30 11:03:48'),(71,12,1,4,'SIT_TESTING','TESTING',4,'CLOSED','2026-06-30 04:58:49','2026-06-30 11:03:48'),(72,12,1,5,'SIT_COMPLETED','TASK',5,'CLOSED','2026-06-30 04:58:49','2026-06-30 11:04:22'),(73,12,1,6,'CODE_REVIEW','CODE_REVIEW',6,'CLOSED','2026-06-30 04:58:49','2026-06-30 11:09:20'),(74,12,1,7,'CODE_REVIEW_DONE','TASK',7,'CLOSED','2026-06-30 04:58:49','2026-06-30 11:18:45'),(75,12,1,8,'MOVE_TO_UAT','TASK',8,'CLOSED','2026-06-30 04:58:49','2026-07-01 05:05:11'),(76,12,1,9,'UAT_TESTING','TESTING',9,'CLOSED','2026-06-30 04:58:49','2026-07-01 05:06:01'),(77,12,1,10,'UAT_COMPLETED','TASK',10,'IN_PROGRESS','2026-06-30 04:58:49','2026-07-01 05:06:01'),(78,12,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 04:58:49','2026-06-30 04:58:49'),(79,12,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 04:58:49','2026-06-30 04:58:49'),(80,12,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 04:58:49','2026-06-30 04:58:49'),(81,1,1,1,'OPEN','TASK',1,'IN_PROGRESS','2026-06-30 11:58:35','2026-06-30 11:58:35'),(82,1,1,2,'IN_PROGRESS','TASK',2,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(83,1,1,3,'SIT_DEPLOYED','TASK',3,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(84,1,1,4,'SIT_TESTING','TESTING',4,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(85,1,1,5,'SIT_COMPLETED','TASK',5,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(86,1,1,6,'CODE_REVIEW','CODE_REVIEW',6,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(87,1,1,7,'CODE_REVIEW_DONE','TASK',7,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(88,1,1,8,'MOVE_TO_UAT','TASK',8,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(89,1,1,9,'UAT_TESTING','TESTING',9,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(90,1,1,10,'UAT_COMPLETED','TASK',10,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(91,1,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(92,1,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(93,1,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(94,2,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(95,2,1,2,'IN_PROGRESS','TASK',2,'IN_PROGRESS','2026-06-30 11:58:35','2026-06-30 11:58:35'),(96,2,1,3,'SIT_DEPLOYED','TASK',3,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(97,2,1,4,'SIT_TESTING','TESTING',4,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(98,2,1,5,'SIT_COMPLETED','TASK',5,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(99,2,1,6,'CODE_REVIEW','CODE_REVIEW',6,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(100,2,1,7,'CODE_REVIEW_DONE','TASK',7,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(101,2,1,8,'MOVE_TO_UAT','TASK',8,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(102,2,1,9,'UAT_TESTING','TESTING',9,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(103,2,1,10,'UAT_COMPLETED','TASK',10,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(104,2,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(105,2,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(106,2,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(107,3,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(108,3,1,2,'IN_PROGRESS','TASK',2,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(109,3,1,3,'SIT_DEPLOYED','TASK',3,'IN_PROGRESS','2026-06-30 11:58:35','2026-06-30 11:58:35'),(110,3,1,4,'SIT_TESTING','TESTING',4,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(111,3,1,5,'SIT_COMPLETED','TASK',5,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(112,3,1,6,'CODE_REVIEW','CODE_REVIEW',6,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(113,3,1,7,'CODE_REVIEW_DONE','TASK',7,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(114,3,1,8,'MOVE_TO_UAT','TASK',8,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(115,3,1,9,'UAT_TESTING','TESTING',9,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(116,3,1,10,'UAT_COMPLETED','TASK',10,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(117,3,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(118,3,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(119,3,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(120,4,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(121,4,1,2,'IN_PROGRESS','TASK',2,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(122,4,1,3,'SIT_DEPLOYED','TASK',3,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(123,4,1,4,'SIT_TESTING','TESTING',4,'IN_PROGRESS','2026-06-30 11:58:35','2026-06-30 11:58:35'),(124,4,1,5,'SIT_COMPLETED','TASK',5,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(125,4,1,6,'CODE_REVIEW','CODE_REVIEW',6,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(126,4,1,7,'CODE_REVIEW_DONE','TASK',7,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(127,4,1,8,'MOVE_TO_UAT','TASK',8,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(128,4,1,9,'UAT_TESTING','TESTING',9,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(129,4,1,10,'UAT_COMPLETED','TASK',10,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(130,4,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(131,4,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(132,4,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(133,5,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(134,5,1,2,'IN_PROGRESS','TASK',2,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(135,5,1,3,'SIT_DEPLOYED','TASK',3,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(136,5,1,4,'SIT_TESTING','TESTING',4,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(137,5,1,5,'SIT_COMPLETED','TASK',5,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(138,5,1,6,'CODE_REVIEW','CODE_REVIEW',6,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(139,5,1,7,'CODE_REVIEW_DONE','TASK',7,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(140,5,1,8,'MOVE_TO_UAT','TASK',8,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(141,5,1,9,'UAT_TESTING','TESTING',9,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(142,5,1,10,'UAT_COMPLETED','TASK',10,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(143,5,1,11,'PROD_DEPLOYED','TASK',11,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(144,5,1,12,'PROD_COMPLETED','TASK',12,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(145,5,1,13,'CLOSED','TASK',13,'IN_PROGRESS','2026-06-30 11:58:35','2026-06-30 11:58:35'),(146,6,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(147,6,1,2,'IN_PROGRESS','TASK',2,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(148,6,1,3,'SIT_DEPLOYED','TASK',3,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(149,6,1,4,'SIT_TESTING','TESTING',4,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(150,6,1,5,'SIT_COMPLETED','TASK',5,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(151,6,1,6,'CODE_REVIEW','CODE_REVIEW',6,'CLOSED','2026-06-30 11:58:35','2026-07-01 04:09:48'),(152,6,1,7,'CODE_REVIEW_DONE','TASK',7,'CLOSED','2026-06-30 11:58:35','2026-07-01 04:11:15'),(153,6,1,8,'MOVE_TO_UAT','TASK',8,'CLOSED','2026-06-30 11:58:35','2026-07-01 06:36:53'),(154,6,1,9,'UAT_TESTING','TESTING',9,'IN_PROGRESS','2026-06-30 11:58:35','2026-07-01 06:36:53'),(155,6,1,10,'UAT_COMPLETED','TASK',10,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(156,6,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(157,6,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(158,6,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(159,7,1,1,'OPEN','TASK',1,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(160,7,1,2,'IN_PROGRESS','TASK',2,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(161,7,1,3,'SIT_DEPLOYED','TASK',3,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(162,7,1,4,'SIT_TESTING','TESTING',4,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(163,7,1,5,'SIT_COMPLETED','TASK',5,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(164,7,1,6,'CODE_REVIEW','CODE_REVIEW',6,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(165,7,1,7,'CODE_REVIEW_DONE','TASK',7,'CLOSED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(166,7,1,8,'MOVE_TO_UAT','TASK',8,'CLOSED','2026-06-30 11:58:35','2026-07-01 04:46:00'),(167,7,1,9,'UAT_TESTING','TESTING',9,'CLOSED','2026-06-30 11:58:35','2026-07-01 04:47:08'),(168,7,1,10,'UAT_COMPLETED','TASK',10,'IN_PROGRESS','2026-06-30 11:58:35','2026-07-01 04:47:08'),(169,7,1,11,'PROD_DEPLOYED','TASK',11,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(170,7,1,12,'PROD_COMPLETED','TASK',12,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35'),(171,7,1,13,'CLOSED','TASK',13,'NOT_STARTED','2026-06-30 11:58:35','2026-06-30 11:58:35');
/*!40000 ALTER TABLE `task_workflow_map` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `unit_test_doc_url` longtext COLLATE utf8mb4_unicode_ci COMMENT 'Base64-encoded unit testing document uploaded by developer on UAT push',
  `unit_test_doc_name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Original filename of the unit testing document',
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `jtrack_id` (`jtrack_id`),
  KEY `task_type_id` (`task_type_id`),
  KEY `assigned_developer_id` (`assigned_developer_id`),
  KEY `created_by_id` (`created_by_id`),
  KEY `workflow_id` (`workflow_id`),
  KEY `tester_id` (`tester_id`),
  KEY `idx_changes_requested` (`changes_requested`),
  KEY `fk_tasks_previous_tester` (`previous_tester_id`),
  KEY `fk_tasks_reassigned_by` (`reassigned_by_id`),
  CONSTRAINT `fk_tasks_previous_tester` FOREIGN KEY (`previous_tester_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tasks_reassigned_by` FOREIGN KEY (`reassigned_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`),
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`),
  CONSTRAINT `tasks_ibfk_5` FOREIGN KEY (`tester_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_case_tasks`
--

DROP TABLE IF EXISTS `test_case_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `assigned_developer_id` (`assigned_developer_id`),
  KEY `created_by_id` (`created_by_id`),
  KEY `workflow_id` (`workflow_id`),
  CONSTRAINT `test_case_tasks_ibfk_1` FOREIGN KEY (`assigned_developer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `test_case_tasks_ibfk_2` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `test_case_tasks_ibfk_3` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_case_tasks`
--

LOCK TABLES `test_case_tasks` WRITE;
/*!40000 ALTER TABLE `test_case_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `test_case_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_cases`
--

DROP TABLE IF EXISTS `test_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_cases`
--

LOCK TABLES `test_cases` WRITE;
/*!40000 ALTER TABLE `test_cases` DISABLE KEYS */;
/*!40000 ALTER TABLE `test_cases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_notification_preferences`
--

DROP TABLE IF EXISTS `user_notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_notification_preferences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT 'FK to users.id',
  `sprint_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `bug_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `deployment_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `summary_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_notification_preferences`
--

LOCK TABLES `user_notification_preferences` WRITE;
/*!40000 ALTER TABLE `user_notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`,`role`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,'CODEREVIEWER'),(1,'DEVADMIN'),(2,'DEVELOPER'),(3,'TESTER');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$12$85O7dZ.nAcJM8rrM8juVWucEjZBK8Ilp5yTqug1uvALNZc0mVfCTO','System Administrator','admin@devtrack.com',0,0,0,NULL,0,NULL,0,NULL,NULL,0,NULL),(2,'developer','$2b$12$qfDEqpBFjaFqid5ptOwZ1.iifR1gNZHwuzSGxpQthAb3ddgAI5zUi','Lead Developer','developer@devtrack.com',0,0,0,NULL,0,NULL,0,NULL,NULL,0,NULL),(3,'tester','$2b$12$exuQsMPKWMaqUIsAB3q8i.Pj5K3ZWT8QZKezqgnwzkPDkPiREAepO','QA Tester','tester@devtrack.com',0,0,0,NULL,0,NULL,0,NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflow_steps`
--

DROP TABLE IF EXISTS `workflow_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_steps` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workflow_id` bigint DEFAULT NULL,
  `step_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `workflow_id` (`workflow_id`),
  CONSTRAINT `workflow_steps_ibfk_1` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_steps`
--

LOCK TABLES `workflow_steps` WRITE;
/*!40000 ALTER TABLE `workflow_steps` DISABLE KEYS */;
INSERT INTO `workflow_steps` VALUES (1,1,'OPEN','TASK',1),(2,1,'IN_PROGRESS','TASK',2),(3,1,'SIT_DEPLOYED','TASK',3),(4,1,'SIT_TESTING','TESTING',4),(5,1,'SIT_COMPLETED','TASK',5),(6,1,'CODE_REVIEW','CODE_REVIEW',6),(7,1,'CODE_REVIEW_DONE','TASK',7),(8,1,'MOVE_TO_UAT','TASK',8),(9,1,'UAT_TESTING','TESTING',9),(10,1,'UAT_COMPLETED','TASK',10),(11,1,'PROD_DEPLOYED','TASK',11),(12,1,'PROD_COMPLETED','TASK',12),(13,1,'CLOSED','TASK',13),(14,2,'OPEN','TASK',1),(15,2,'IN_PROGRESS','TASK',2),(16,2,'RESOLVED','TASK',3),(17,2,'VERIFIED','TESTING',4),(18,2,'CLOSED','TASK',5);
/*!40000 ALTER TABLE `workflow_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflows`
--

DROP TABLE IF EXISTS `workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflows` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflows`
--

LOCK TABLES `workflows` WRITE;
/*!40000 ALTER TABLE `workflows` DISABLE KEYS */;
INSERT INTO `workflows` VALUES (1,'Standard Dev Workflow','TASK'),(2,'Bug Resolution Workflow','BUG');
/*!40000 ALTER TABLE `workflows` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-01 13:09:23
