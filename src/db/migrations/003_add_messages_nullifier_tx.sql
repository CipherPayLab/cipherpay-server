/* ============================================================================
   CipherPay Server – Add nullifier_hex and tx_signature to messages table
   ============================================================================ */
USE `cipherpay_server`;

-- Add nullifier_hex column to messages table (for linking messages to nullifiers)
ALTER TABLE `messages` 
  ADD COLUMN `nullifier_hex` VARCHAR(64) NULL AFTER `content_hash`,
  ADD KEY `ix_messages_nullifier_hex` (`nullifier_hex`);

-- Add tx_signature column to messages table (for linking messages to transactions)
ALTER TABLE `messages` 
  ADD COLUMN `tx_signature` VARCHAR(88) NULL AFTER `nullifier_hex`,
  ADD KEY `ix_messages_tx_signature` (`tx_signature`);

