import { prisma } from "../db/prisma.js";

export interface WithdrawMappingRecord {
  txSignature: string;
  nullifierHex: string;
  ownerCipherPayPubKey: string;
}

export async function upsertWithdrawMapping(record: WithdrawMappingRecord) {
  try {
    await prisma.withdraw_mappings.upsert({
      where: { tx_signature: record.txSignature },
      update: {
        nullifier_hex: record.nullifierHex,
        owner_cipherpay_pub_key: record.ownerCipherPayPubKey,
      },
      create: {
        tx_signature: record.txSignature,
        nullifier_hex: record.nullifierHex,
        owner_cipherpay_pub_key: record.ownerCipherPayPubKey,
      },
    });
  } catch (error) {
    console.error("[withdrawMapping] Failed to upsert mapping:", error);
  }
}

export async function getWithdrawMappingByTxSignature(txSignature: string) {
  try {
    return await prisma.withdraw_mappings.findUnique({
      where: { tx_signature: txSignature },
    });
  } catch (error) {
    console.error("[withdrawMapping] Failed to read mapping:", error);
    return null;
  }
}

