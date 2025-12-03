/* ============================================================================
  CipherPay Server – Track withdraw txs for owner lookup
  ============================================================================
*/
USE `cipherpay_server`;

CREATE TABLE IF NOT EXISTS `withdraw_mappings` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tx_signature`           VARCHAR(88)     NOT NULL,
  `nullifier_hex`          CHAR(64)        NOT NULL,
  `owner_cipherpay_pub_key` VARCHAR(66)    NOT NULL,
  `created_at`             TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_withdraw_mappings_tx_signature` (`tx_signature`),
  KEY `ix_withdraw_mappings_nullifier` (`nullifier_hex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

