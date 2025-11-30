-- Migration: Add note_enc_pub_key column to users table
-- This column stores the note encryption public key (from identity keypair pubKey, derived from wallet signature)
-- Used for secure E2EE encryption of notes: sender queries this to get recipient's encryption public key

ALTER TABLE `users` 
ADD COLUMN `note_enc_pub_key` VARCHAR(66) NULL 
AFTER `owner_curve_pub_y`;

-- Add index for faster lookups
CREATE INDEX `ix_users_note_enc_pub_key` ON `users` (`note_enc_pub_key`);

