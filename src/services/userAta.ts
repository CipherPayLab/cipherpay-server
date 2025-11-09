// src/services/userAta.ts
// Helper functions to retrieve user ATAs from database

import { prisma } from "../db/prisma.js";

/**
 * Get WSOL ATA for a user by owner cipherpay pub key
 * @param ownerCipherPayPubKey - User's owner cipherpay public key (0x...)
 * @returns WSOL ATA address (base58) or null if not found
 */
export async function getUserWsolAta(
  ownerCipherPayPubKey: string
): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { owner_cipherpay_pub_key: ownerCipherPayPubKey },
    select: { wsol_ata: true },
  });
  
  return user?.wsol_ata ?? null;
}

/**
 * Get WSOL ATA for a user by user ID
 * @param userId - User ID (BigInt as string)
 * @returns WSOL ATA address (base58) or null if not found
 */
export async function getUserWsolAtaById(userId: string | bigint): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { id: BigInt(userId) },
    select: { wsol_ata: true },
  });
  
  return user?.wsol_ata ?? null;
}

/**
 * Get user's Solana wallet address
 * @param ownerCipherPayPubKey - User's owner cipherpay public key (0x...)
 * @returns Solana wallet address (base58) or null if not found
 */
export async function getUserSolanaWallet(
  ownerCipherPayPubKey: string
): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { owner_cipherpay_pub_key: ownerCipherPayPubKey },
    select: { solana_wallet_address: true },
  });
  
  return user?.solana_wallet_address ?? null;
}

