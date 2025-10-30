import { poseidonN } from "cipherpay-sdk/dist/utils/crypto.js";
import { babyJub, eddsa, buildPoseidonOpt } from "circomlibjs";
import { createHash } from "node:crypto";

/** SHA-256 hex with 0x prefix (for hashing ciphertext prior to Poseidon) */
export function sha256Hex(buf: Uint8Array | Buffer): `0x${string}` {
  return ("0x" + createHash("sha256").update(buf).digest("hex")) as `0x${string}`;
}

/** Verify BabyJubJub EdDSA signature over a Poseidon field element */
export async function verifyBabyJubSig(params: {
  /** message must be a field element (Poseidon output) */
  msgField: bigint;
  sig: { R8x: string; R8y: string; S: string };
  pub: { x: string; y: string };
}): Promise<boolean> {
  const F = babyJub.F;
  const toBI = (h: string) => BigInt(h.startsWith("0x") ? h : "0x" + h);
  const pubKey = [F.e(toBI(params.pub.x)), F.e(toBI(params.pub.y))];
  const signature = {
    R8: [F.e(toBI(params.sig.R8x)), F.e(toBI(params.sig.R8y))],
    S: toBI(params.sig.S),
  };
  // @ts-ignore (eddsa.verify expects circomlib fields)
  return eddsa.verify(signature, params.msgField, pubKey);
}

/** Poseidon(recipientKey || sha256(ciphertext)) for idempotency & dedupe */
export async function computeContentHash(
  recipientKeyHex: `0x${string}`,
  ciphertext: Buffer
): Promise<`0x${string}`> {
  const rec = BigInt(recipientKeyHex);
  const ch = BigInt(sha256Hex(ciphertext));
  const h = await poseidonN([rec, ch]);
  return ("0x" + h.toString(16)) as `0x${string}`;
}

/** Poseidon(nonce || ownerKey) as login challenge message */
export async function poseidonLoginMsg(
  nonceHex: `0x${string}`,
  ownerKeyHex: `0x${string}`
): Promise<bigint> {
  return poseidonN([BigInt(nonceHex), BigInt(ownerKeyHex)]);
}
