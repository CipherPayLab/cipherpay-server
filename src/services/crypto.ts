// src/services/crypto.ts
import * as circomlib from "circomlibjs";
import { poseidonHash } from "cipherpay-sdk";
import { createHash } from "node:crypto";

// Cache for built circomlibjs instances
let babyJub: any = null;
let eddsa: any = null;

/** Load and build circomlibjs components */
async function loadCircomlib() {
  if (babyJub && eddsa) return { babyJub, eddsa };

  // Build BabyJub curve (required in newer versions)
  if (!babyJub) {
    if ((circomlib as any).buildBabyjub) {
      babyJub = await (circomlib as any).buildBabyjub();
    } else if ((circomlib as any).babyjub) {
      babyJub = (circomlib as any).babyjub;
    } else {
      throw new Error("buildBabyjub not available in circomlibjs");
    }
  }

  // Get EdDSA
  if (!eddsa) {
    if ((circomlib as any).eddsa?.buildEddsa) {
      eddsa = await (circomlib as any).eddsa.buildEddsa();
    } else if ((circomlib as any).eddsa) {
      eddsa = (circomlib as any).eddsa;
    } else if ((circomlib as any).buildEddsa) {
      eddsa = await (circomlib as any).buildEddsa();
    } else {
      throw new Error("eddsa not available in circomlibjs");
    }
  }

  return { babyJub, eddsa };
}

/** SHA-256 hex with 0x prefix (for hashing ciphertext prior to Poseidon) */
export function sha256Hex(buf: Uint8Array | Buffer): `0x${string}` {
  return ("0x" + createHash("sha256").update(buf).digest("hex")) as `0x${string}`;
}

/** Convert various inputs to a reduced bigint in the BabyJub field */
function toReducedBigInt(value: unknown, F: any): bigint {
  // 1) Convert input to bigint
  let bi: bigint;
  if (typeof value === "bigint") {
    bi = value;
  } else if (typeof value === "string") {
    // accept 0x-prefixed or decimal strings
    bi = BigInt(value.startsWith("0x") ? value : "0x" + value);
  } else if (value instanceof Uint8Array) {
    const hex = "0x" + Array.from(value).map(b => b.toString(16).padStart(2, "0")).join("");
    bi = BigInt(hex);
  } else if (value && typeof value === "object") {
    // Some callers might pass F.e(...) or F.toObject(...) results.
    // Try F.toObject(value) if it looks like a field element
    try {
      const obj = F.toObject(value);
      if (typeof obj === "bigint") return obj;
      if (obj instanceof Uint8Array) {
        const hex = "0x" + Array.from(obj).map(b => b.toString(16).padStart(2, "0")).join("");
        return BigInt(hex);
      }
      // Fall through to generic stringify path
      bi = BigInt(String(obj));
    } catch {
      // generic fallback
      bi = BigInt(String(value as any));
    }
  } else {
    bi = BigInt(String(value as any));
  }

  // 2) Reduce in field and return as bigint
  const fe = F.e(bi);
  const obj = F.toObject(fe);
  if (typeof obj === "bigint") return obj;
  if (obj instanceof Uint8Array) {
    const hex = "0x" + Array.from(obj).map(b => b.toString(16).padStart(2, "0")).join("");
    return BigInt(hex);
  }
  return BigInt(String(obj));
}

/** Verify BabyJubJub EdDSA signature over a Poseidon field element */
export async function verifyBabyJubSig(params: {
  /** message must be a field element (Poseidon output) */
  msgField: bigint;
  sig: { R8x: string; R8y: string; S: string };
  pub: { x: string; y: string };
}): Promise<boolean> {
  const { babyJub, eddsa } = await loadCircomlib();
  if (!babyJub?.F) throw new Error("babyJub.F is not available. circomlibjs may not be loaded correctly.");
  if (!eddsa) throw new Error("eddsa is not available. circomlibjs may not be loaded correctly.");

  const F = babyJub.F;
  const subOrder: bigint = babyJub.subOrder as bigint; // subgroup order (for S reduction)

  const toBI = (v: unknown) =>
    typeof v === "bigint"
      ? v
      : typeof v === "string"
        ? BigInt(v.startsWith("0x") ? v : "0x" + v)
        : v instanceof Uint8Array
          ? BigInt("0x" + Array.from(v).map(b => b.toString(16).padStart(2, "0")).join(""))
          : BigInt(String(v as any));

  // For curve coordinates, pass field elements (F.e(...))
  const Ax = F.e(toBI(params.pub.x));
  const Ay = F.e(toBI(params.pub.y));
  const R8x = F.e(toBI(params.sig.R8x));
  const R8y = F.e(toBI(params.sig.R8y));

  // For S, pass a scalar bigint reduced mod subgroup order (NOT F.e)
  const Sraw = toBI(params.sig.S);
  const S = ((Sraw % subOrder) + subOrder) % subOrder;

  // Message as bigint (Poseidon output). No need to wrap as F.e
  const message = toBI(params.msgField);

  // Debug (hex)
  const asHex = (x: bigint) => "0x" + x.toString(16);
  console.log("[crypto] verify (hybrid types):", {
    Ax: "0x" + (F.toObject(Ax) as bigint).toString(16),
    Ay: "0x" + (F.toObject(Ay) as bigint).toString(16),
    R8x: "0x" + (F.toObject(R8x) as bigint).toString(16),
    R8y: "0x" + (F.toObject(R8y) as bigint).toString(16),
    S: asHex(S),
    msg: asHex(message),
  });

  // @ts-ignore circomlibjs is loose with types
  const ok = eddsa.verifyPoseidon(message, { R8: [R8x, R8y], S }, [Ax, Ay]);
  console.log("[crypto] verifyPoseidon returned:", ok);
  return ok;
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
