// src/services/userAta.ts
// Helper functions to retrieve user ATAs from database

import { prisma } from "../db/prisma.js";
import { NATIVE_MINT } from "@solana/spl-token";

/**
 * Get ATA for a specific token for a user by owner cipherpay pub key
 * @param ownerCipherPayPubKey - User's owner cipherpay public key (0x...)
 * @param tokenMint - Token mint address (defaults to WSOL/NATIVE_MINT)
 * @returns ATA address (base58) or null if not found
 */
export async function getUserAta(
  ownerCipherPayPubKey: string,
  tokenMint: string = NATIVE_MINT.toBase58()
): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { owner_cipherpay_pub_key: ownerCipherPayPubKey },
    select: { id: true },
  });
  
  if (!user) return null;
  
  const ata = await prisma.user_atas.findUnique({
    where: {
      user_id_token_mint: {
        user_id: user.id,
        token_mint: tokenMint,
      },
    },
    select: { ata_address: true },
  });
  
  return ata?.ata_address ?? null;
}

/**
 * Get WSOL ATA for a user by owner cipherpay pub key (convenience function)
 * @param ownerCipherPayPubKey - User's owner cipherpay public key (0x...)
 * @returns WSOL ATA address (base58) or null if not found
 */
export async function getUserWsolAta(
  ownerCipherPayPubKey: string
): Promise<string | null> {
  return getUserAta(ownerCipherPayPubKey, NATIVE_MINT.toBase58());
}

/**
 * Get ATA for a specific token for a user by user ID
 * @param userId - User ID (BigInt as string)
 * @param tokenMint - Token mint address (defaults to WSOL/NATIVE_MINT)
 * @returns ATA address (base58) or null if not found
 */
export async function getUserAtaById(
  userId: string | bigint,
  tokenMint: string = NATIVE_MINT.toBase58()
): Promise<string | null> {
  const ata = await prisma.user_atas.findUnique({
    where: {
      user_id_token_mint: {
        user_id: BigInt(userId),
        token_mint: tokenMint,
      },
    },
    select: { ata_address: true },
  });
  
  return ata?.ata_address ?? null;
}

/**
 * Get WSOL ATA for a user by user ID (convenience function)
 * @param userId - User ID (BigInt as string)
 * @returns WSOL ATA address (base58) or null if not found
 */
export async function getUserWsolAtaById(userId: string | bigint): Promise<string | null> {
  return getUserAtaById(userId, NATIVE_MINT.toBase58());
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

/**
 * Get all ATAs for a user by owner cipherpay pub key
 * @param ownerCipherPayPubKey - User's owner cipherpay public key (0x...)
 * @returns Map of token mint -> ATA address
 */
export async function getAllUserAtas(
  ownerCipherPayPubKey: string
): Promise<Record<string, string>> {
  const user = await prisma.users.findUnique({
    where: { owner_cipherpay_pub_key: ownerCipherPayPubKey },
    select: { id: true },
  });
  
  if (!user) return {};
  
  const atas = await prisma.user_atas.findMany({
    where: { user_id: user.id },
    select: { token_mint: true, ata_address: true },
  });
  
  const result: Record<string, string> = {};
  for (const ata of atas) {
    result[ata.token_mint] = ata.ata_address;
  }
  
  return result;
}

/**
 * Store or update ATA for a user and token
 * @param userId - User ID (BigInt)
 * @param tokenMint - Token mint address
 * @param ataAddress - ATA address to store
 */
export async function setUserAta(
  userId: bigint,
  tokenMint: string,
  ataAddress: string
): Promise<void> {
  await prisma.user_atas.upsert({
    where: {
      user_id_token_mint: {
        user_id: userId,
        token_mint: tokenMint,
      },
    },
    update: {
      ata_address: ataAddress,
    },
    create: {
      user_id: userId,
      token_mint: tokenMint,
      ata_address: ataAddress,
    },
  });
}

