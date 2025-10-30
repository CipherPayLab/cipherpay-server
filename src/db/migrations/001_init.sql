/* ============================================================================
   CipherPay Server – MySQL schema (InnoDB, utf8mb4)
   ============================================================================ */
CREATE DATABASE IF NOT EXISTS `cipherpay_server`
  /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */;
USE `cipherpay_server`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_key`       VARCHAR(66)     NOT NULL,
  `auth_pub_x`      VARCHAR(66)     NOT NULL,
  `auth_pub_y`      VARCHAR(66)     NOT NULL,
  `display_name`    VARCHAR(64)     NULL,
  `avatar_url`      VARCHAR(256)    NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_owner_key` (`owner_key`),
  KEY `ix_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `nonce`       VARCHAR(96)     NOT NULL,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`  TIMESTAMP       NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sessions_user_id` (`user_id`),
  KEY `ix_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `messages` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_key`  VARCHAR(66)     NOT NULL,
  `sender_key`     VARCHAR(66)     NULL,
  `ciphertext`     LONGBLOB        NOT NULL,
  `kind`           VARCHAR(24)     NOT NULL,
  `content_hash`   VARCHAR(66)     NOT NULL,
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at`        TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_messages_content_hash` (`content_hash`),
  KEY `ix_messages_recipient_created` (`recipient_key`, `created_at` DESC),
  KEY `ix_messages_sender_created` (`sender_key`, `created_at` DESC),
  KEY `ix_messages_read_at` (`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tx` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chain`         VARCHAR(16)     NOT NULL DEFAULT 'solana',
  `commitment`    VARCHAR(66)     NOT NULL,
  `leaf_index`    INT UNSIGNED    NOT NULL,
  `merkle_root`   VARCHAR(66)     NOT NULL,
  `signature`     VARCHAR(120)    NULL,
  `event`         VARCHAR(24)     NOT NULL,
  `recipient_key` VARCHAR(66)     NULL,
  `sender_key`    VARCHAR(66)     NULL,
  `timestamp`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tx_commitment` (`commitment`),
  KEY `ix_tx_leaf_index` (`leaf_index`),
  KEY `ix_tx_event_time` (`event`, `timestamp` DESC),
  KEY `ix_tx_recipient_time` (`recipient_key`, `timestamp` DESC),
  KEY `ix_tx_sender_time` (`sender_key`, `timestamp` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `contacts` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `alias`      VARCHAR(64)     NOT NULL,
  `peer_key`   VARCHAR(66)     NOT NULL,
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_contacts_user_id` (`user_id`),
  UNIQUE KEY `uq_contacts_user_peer` (`user_id`, `peer_key`),
  CONSTRAINT `fk_contacts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_key`    VARCHAR(100)    NOT NULL,
  `tenant`     VARCHAR(64)     NOT NULL,
  `disabled`   TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_api_keys_key` (`api_key`),
  KEY `ix_api_keys_tenant` (`tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
