import { z } from "zod";
import { TOKENS, bigintifySignals } from "cipherpay-sdk"; // shared registry + helpers

/** 0x-prefixed hex (lower/upper both OK) */
export const Hex0xZ = z.string().regex(/^0x[0-9a-fA-F]+$/);

/** Allowed message kinds (kept narrow so UI/server stay in sync) */
export const KnownKindsZ = z.enum(["note-transfer", "note-deposit", "note-message", "note-withdraw"]);

/** Validate a token identifier against the SDK registry */
export const TokenIdZ = z
  .string()
  .refine((s) => !!TOKENS[s as keyof typeof TOKENS], (s) => ({ message: `Unknown tokenId: ${s}` }));

/** Example: validate + normalize deposit public signals */
export const DepositSignalsZ = z.object({
  amount: z.union([z.string(), z.number(), z.bigint()]),
  depositHash: z.union([z.string(), z.number(), z.bigint()]),
  newCommitment: z.union([z.string(), z.number(), z.bigint()]),
  ownerCipherPayPubKey: Hex0xZ,
  merkleRoot: z.union([z.string(), z.number(), z.bigint()]),
  nextLeafIndex: z.coerce.number().int().nonnegative(),
  tokenId: TokenIdZ, // e.g., "WSOL"
});
export type DepositSignals = z.infer<typeof DepositSignalsZ>;

/** Convert deposit signals' numeric-like fields to bigint for parity with circuits */
export function normalizeDepositSignals(s: DepositSignals) {
  const b = bigintifySignals(s); // uses SDK helper for robust coercion
  return {
    ...s,
    amount: b.amount,
    depositHash: b.depositHash,
    newCommitment: b.newCommitment,
    merkleRoot: b.merkleRoot,
    // nextLeafIndex stays number (u32 on-chain)
  };
}

/** Optional helper to ensure tokenId maps to known registry entry; returns same string */
export function ensureKnownTokenId(tokenId: string) {
  const known = TOKENS[tokenId as keyof typeof TOKENS];
  if (!known) throw new Error(`Unknown tokenId: ${tokenId}`);
  return tokenId;
}
