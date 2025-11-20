// Account Overview endpoint
// Accepts decrypted notes from client and returns account overview

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeAccountOverview, Note } from "../services/accountOverview.js";

const NoteSchema = z.object({
  amount: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  tokenId: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  ownerCipherPayPubKey: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  randomness: z.object({
    r: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
    s: z.union([z.string(), z.number(), z.bigint()]).optional().transform((v) => v ? BigInt(v) : undefined),
  }),
  memo: z.string().optional(),
});

export default async function (app: FastifyInstance) {
  /**
   * POST /api/v1/account/overview
   * Accepts decrypted notes and returns account overview
   * 
   * Body: {
   *   notes: Note[],
   *   checkOnChain?: boolean  // If true, check on-chain for nullifiers not in DB
   * }
   * 
   * Response: {
   *   shieldedBalance: string,  // BigInt as hex string
   *   spendableNotes: number,
   *   totalNotes: number,
   *   notes: Array<{
   *     note: Note,
   *     nullifierHex: string,
   *     isSpent: boolean,
   *     amount: string  // BigInt as hex string
   *   }>
   * }
   */
  app.post("/api/v1/account/overview", { preHandler: app.auth }, async (req, rep) => {
    const body = z
      .object({
        notes: z.array(NoteSchema),
        checkOnChain: z.boolean().optional().default(false),
      })
      .parse(req.body);

    try {
      const overview = await computeAccountOverview(body.notes, body.checkOnChain);

      // Convert BigInts to hex strings for JSON serialization
      return rep.send({
        shieldedBalance: "0x" + overview.shieldedBalance.toString(16),
        spendableNotes: overview.spendableNotes,
        totalNotes: overview.totalNotes,
        notes: overview.notes.map((n) => ({
          note: {
            amount: "0x" + n.note.amount.toString(16),
            tokenId: "0x" + n.note.tokenId.toString(16),
            ownerCipherPayPubKey: "0x" + n.note.ownerCipherPayPubKey.toString(16),
            randomness: {
              r: "0x" + n.note.randomness.r.toString(16),
              s: n.note.randomness.s ? "0x" + n.note.randomness.s.toString(16) : undefined,
            },
            memo: n.note.memo,
          },
          nullifierHex: n.nullifierHex,
          isSpent: n.isSpent,
          amount: "0x" + n.amount.toString(16),
        })),
      });
    } catch (error: any) {
      app.log.error({ error }, "Failed to compute account overview");
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}

