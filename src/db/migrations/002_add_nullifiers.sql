/* ============================================================================
   CipherPay Server – Add nullifiers table for tracking spent notes
   ============================================================================ */
USE `cipherpay_server`;

-- Nullifiers table: tracks which notes have been spent (on-chain source of truth)
CREATE TABLE IF NOT EXISTS `nullifiers` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nullifier`     BINARY(32)      NOT NULL,     -- 32-byte nullifier (little-endian)
  `nullifier_hex` CHAR(64)        NOT NULL,     -- hex representation for queries
  `pda_address`    VARCHAR(44)     NOT NULL,     -- Solana PDA address for this nullifier
  `used`           TINYINT(1)      NOT NULL DEFAULT 0,  -- true if spent on-chain
  `tx_signature`   VARCHAR(88)     NULL,         -- Solana transaction signature that spent it
  `event_type`     VARCHAR(24)     NULL,         -- 'transfer' or 'withdraw'
  `spent_at`       TIMESTAMP(0)    NULL,         -- when it was spent (from on-chain)
  `synced_at`      TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- last sync time
  `created_at`     TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nullifiers_nullifier` (`nullifier_hex`),
  UNIQUE KEY `uq_nullifiers_pda` (`pda_address`),
  KEY `ix_nullifiers_used` (`used`),
  KEY `ix_nullifiers_synced` (`synced_at`),
  KEY `ix_nullifiers_tx` (`tx_signature`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add nullifier reference to tx table (optional, for linking)
-- Note: We can extract nullifiers from tx table's public inputs if needed
-- This is just for easier querying
ALTER TABLE `tx` 
  ADD COLUMN `nullifier_hex` CHAR(64) NULL AFTER `signature`,
  ADD KEY `ix_tx_nullifier` (`nullifier_hex`);

