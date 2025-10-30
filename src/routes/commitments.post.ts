import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

export default async function (app: FastifyInstance) {
  app.post("/commitments", async (req, rep) => {
    const body = z
      .object({
        commitment: z.string().regex(/^0x[0-9a-fA-F]+$/),
        index: z.number().int().nonnegative(),
        merkleRoot: z.string().regex(/^0x[0-9a-fA-F]+$/),
        txId: z.string().optional(),
        event: z
          .enum(["DepositCompleted", "TransferCompleted", "WithdrawCompleted"])
          .default("DepositCompleted"),
        recipientKey: z
          .string()
          .regex(/^0x[0-9a-fA-F]+$/)
          .optional(),
        senderKey: z
          .string()
          .regex(/^0x[0-9a-fA-F]+$/)
          .optional(),
      })
      .parse(req.body);

    const row = await prisma.tx.upsert({
      where: { commitment: body.commitment },
      update: {
        leaf_index: body.index,
        merkle_root: body.merkleRoot,
        signature: body.txId ?? null,
        event: body.event,
        recipient_key: body.recipientKey ?? null,
        sender_key: body.senderKey ?? null,
      },
      create: {
        chain: "solana",
        commitment: body.commitment,
        leaf_index: body.index,
        merkle_root: body.merkleRoot,
        signature: body.txId ?? null,
        event: body.event,
        recipient_key: body.recipientKey ?? null,
        sender_key: body.senderKey ?? null,
      },
    });

    return rep.send({ ok: true, id: row.id });
  });
}
