CREATE DATABASE IF NOT EXISTS `healthguard` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `healthguard`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(128) NOT NULL,
  `age` INT NULL,
  `sex` VARCHAR(16) NULL,
  `barangay` VARCHAR(96) NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(16) NOT NULL DEFAULT 'resident',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `ix_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `code` VARCHAR(16) NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `full_name` VARCHAR(128) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `age` INT NULL,
  `sex` VARCHAR(16) NULL,
  `barangay` VARCHAR(96) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_verifications_email` (`email`),
  KEY `ix_email_verifications_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `symptom_lexicon` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `local_term` VARCHAR(128) NOT NULL,
  `language` VARCHAR(8) NOT NULL,
  `medical_term` VARCHAR(128) NOT NULL,
  `severity_weight` INT NOT NULL DEFAULT 1,
  `category` VARCHAR(64) NOT NULL DEFAULT 'general',
  PRIMARY KEY (`id`),
  KEY `ix_symptom_lexicon_local_term` (`local_term`),
  KEY `ix_symptom_lexicon_medical_term` (`medical_term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `input_text` LONGTEXT NOT NULL,
  `method` VARCHAR(16) NOT NULL DEFAULT 'text',
  `detected_symptoms` JSON NOT NULL,
  `risk_level` VARCHAR(8) NOT NULL,
  `reason` LONGTEXT NOT NULL,
  `recommendation` LONGTEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_assessments_user_id` (`user_id`),
  KEY `ix_assessments_risk_level` (`risk_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`)
VALUES (
  'System Administrator',
  'acefin24@gmail.com',
  '$2b$12$N6DZa8q3v6fB9seVg9Xzuu5B1f9dK3/jdl/x2MblvU8nDuC3S2Ne6',
  'admin',
  1,
  NOW()
)
ON DUPLICATE KEY UPDATE `email` = `email`;

INSERT INTO `users` (`full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`)
VALUES (
  'Municipal Health Officer',
  'healthguard.irosin@gmail.com',
  '$2b$12$N6DZa8q3v6fB9seVg9Xzuu5B1f9dK3/jdl/x2MblvU8nDuC3S2Ne6',
  'mho',
  1,
  NOW()
)
ON DUPLICATE KEY UPDATE `email` = `email`;
