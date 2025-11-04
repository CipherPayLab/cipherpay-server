import * as circomlib from "circomlibjs";
import { poseidonHash } from "cipherpay-sdk";
import { createHash } from "node:crypto";

// Cache for built circomlibjs instances
let babyJub: any = null;
let eddsa: any = null;

/** Load and build circomlibjs components */
async function loadCircomlib() {
  if (babyJub && eddsa) {
    return { babyJub, eddsa };
  }

  // Build BabyJub curve (required in newer versions)
  if (!babyJub) {
    if (circomlib.buildBabyjub) {
      babyJub = await circomlib.buildBabyjub();
    } else if ((circomlib as any).babyjub) {
      babyJub = (circomlib as any).babyjub;
    } else {
      throw new Error('buildBabyjub not available in circomlibjs');
    }
  }

  // Get EdDSA
  if (!eddsa) {
    if ((circomlib as any).eddsa && typeof (circomlib as any).eddsa.buildEddsa === 'function') {
      eddsa = await (circomlib as any).eddsa.buildEddsa();
    } else if ((circomlib as any).eddsa) {
      eddsa = (circomlib as any).eddsa;
    } else if (circomlib.buildEddsa && typeof circomlib.buildEddsa === 'function') {
      eddsa = await circomlib.buildEddsa();
    } else {
      throw new Error('eddsa not available in circomlibjs');
    }
  }

  return { babyJub, eddsa };
}

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
  const { babyJub, eddsa } = await loadCircomlib();
  if (!babyJub || !babyJub.F) {
    throw new Error('babyJub.F is not available. circomlibjs may not be loaded correctly.');
  }
  if (!eddsa) {
    throw new Error('eddsa is not available. circomlibjs may not be loaded correctly.');
  }

  const F = babyJub.F;
  const toBI = (h: string) => BigInt(h.startsWith("0x") ? h : "0x" + h);
  
  console.log('[crypto] Input values before conversion:', {
    pubX: params.pub.x,
    pubY: params.pub.y,
    msgField: params.msgField.toString(),
    R8x: params.sig.R8x,
    R8y: params.sig.R8y,
    S: params.sig.S,
  });
  
  const pubKey = [F.e(toBI(params.pub.x)), F.e(toBI(params.pub.y))];
  const msgField = F.e(params.msgField); // Convert BigInt to field element
  const signature = {
    R8: [F.e(toBI(params.sig.R8x)), F.e(toBI(params.sig.R8y))],
    S: F.e(toBI(params.sig.S)),
  };
  
  console.log('[crypto] Converted to field elements, calling verifyPoseidon...');
  console.log('[crypto] About to call: eddsa.verifyPoseidon(message, signature, pubKey)');
  
  // @ts-ignore (eddsa.verify expects circomlib fields)
  // Standard EdDSA signature: verify(message, signature, publicKey)
  const result = eddsa.verifyPoseidon(msgField, signature, pubKey);
  console.log('[crypto] verifyPoseidon returned:', result);
  return result;
}

/** Poseidon(recipientKey || sha256(ciphertext)) for idempotency & dedupe */
export async function computeContentHash(
  recipientKeyHex: `0x${string}`,
  ciphertext: Buffer
): Promise<`0x${string}`> {
  const rec = BigInt(recipientKeyHex);
  const ch = BigInt(sha256Hex(ciphertext));
  const h = await poseidonHash([rec, ch]);
  return ("0x" + h.toString(16)) as `0x${string}`;
}

/** Poseidon(nonce || ownerKey) as login challenge message */
export async function poseidonLoginMsg(
  nonceHex: `0x${string}`,
  ownerKeyHex: `0x${string}`
): Promise<bigint> {
  return poseidonHash([BigInt(nonceHex), BigInt(ownerKeyHex)]);
}
