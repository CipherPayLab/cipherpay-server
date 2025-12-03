import { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeNullifierBigInt, nullifierToHex, normalizeOwnerCipherPayKey } from "../services/nullifierUtils.js";
import { upsertWithdrawMapping } from "../services/withdrawMapping.js";

const BodySchema = z.object({
  txSignature: z.string().min(1),
  ownerCipherPayPubKey: z.string().regex(/^0x[0-9a-fA-F]{66}$/),
  tokenId: z.union([z.string(), z.bigint(), z.number()]),
  randomness: z.object({
    r: z.union([z.string(), z.bigint(), z.number()]),
    s: z.union([z.string(), z.bigint(), z.number()]).optional(),
  }),
});

export default async function (app: FastifyInstance) {
  app.post("/api/v1/withdraws/map", { preHandler: app.auth }, async (req, rep) => {
    const body = BodySchema.parse(req.body);

    try {
      const nullifier = await computeNullifierBigInt({
        ownerCipherPayPubKey: body.ownerCipherPayPubKey,
        randomnessR: body.randomness.r,
        tokenId: body.tokenId,
      });
      const nullifierHex = nullifierToHex(nullifier);

      await upsertWithdrawMapping({
        txSignature: body.txSignature,
        nullifierHex,
        ownerCipherPayPubKey: normalizeOwnerCipherPayKey(body.ownerCipherPayPubKey),
      });

      return rep.send({ ok: true });
    } catch (error: any) {
      app.log.error({ error }, "Failed to register withdraw mapping");
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}

