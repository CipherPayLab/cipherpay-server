// Account Overview Service
// Computes account overview (shielded balance, spendable notes, total notes) from decrypted notes

import { poseidonHash } from "cipherpay-sdk";
import { isNullifierSpent } from "./nullifiers.js";

/**
 * Note structure (matches cipherpay-sdk/src/types/core.ts)
 */
export interface Note {
  amount: bigint;
  tokenId: bigint;
  ownerCipherPayPubKey: bigint;
  randomness: { r: bigint; s?: bigint };
  memo?: string;
}

/**
 * Account Overview result
 */
export interface AccountOverview {
  shieldedBalance: bigint; // Sum of unspent note amounts
  spendableNotes: number; // Count of notes that haven't been spent
  totalNotes: number; // Total count of notes
  notes: Array<{
    note: Note;
    nullifierHex: string;
    isSpent: boolean;
    amount: bigint;
  }>;
}

/**
 * Compute nullifier from a note
 * Formula: Poseidon(ownerCipherPayPubKey, randomness.r, tokenId)
 * (Matches NullifierFromCipherKey template in circuits/nullifier/nullifier.circom)
 */
export async function computeNullifier(note: Note): Promise<bigint> {
  return poseidonHash([
    note.ownerCipherPayPubKey,
    note.randomness.r,
    note.tokenId,
  ]);
}

/**
 * Convert nullifier (bigint) to hex string (64 chars, no 0x prefix)
 * Field elements are represented as 32-byte little-endian values
 */
export function nullifierToHex(nullifier: bigint): string {
  // Convert bigint to 32-byte buffer (little-endian)
  const buf = Buffer.allocUnsafe(32);
  let n = nullifier;
  
  // Write as little-endian bytes
  for (let i = 0; i < 32; i++) {
    buf[i] = Number(n & 0xffn);
    n = n >> 8n;
  }
  
  return buf.toString("hex");
}

/**
 * Compute account overview from decrypted notes
 * Checks nullifier status for each note to determine if it's spent
 */
export async function computeAccountOverview(
  notes: Note[],
  checkOnChain: boolean = false
): Promise<AccountOverview> {
  const results = await Promise.all(
    notes.map(async (note) => {
      const nullifier = await computeNullifier(note);
      const nullifierHex = nullifierToHex(nullifier);
      const isSpent = await isNullifierSpent(nullifierHex, checkOnChain);

      return {
        note,
        nullifierHex,
        isSpent,
        amount: note.amount,
      };
    })
  );

  const spendableNotes = results.filter((r) => !r.isSpent);
  const shieldedBalance = spendableNotes.reduce(
    (sum, r) => sum + r.amount,
    0n
  );

  return {
    shieldedBalance,
    spendableNotes: spendableNotes.length,
    totalNotes: notes.length,
    notes: results,
  };
}

