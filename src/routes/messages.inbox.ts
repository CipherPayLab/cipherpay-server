import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

export default async function (app: FastifyInstance) {
  app.get("/messages/inbox", { preHandler: app.auth }, async (req, rep) => {
    const q = z
      .object({
        recipientKey: z.string().regex(/^0x[0-9a-fA-F]+$/),
        limit: z.coerce.number().min(1).max(100).default(50),
        cursor: z.coerce.bigint().optional(),
      })
      .parse(req.query);

    const rows = await prisma.messages.findMany({
      where: { recipient_key: q.recipientKey },
      orderBy: { created_at: "desc" },
      take: q.limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    // return ciphertext as base64
    return rep.send(
      rows.map((r) => ({
        id: r.id,
        senderKey: r.sender_key,
        recipientKey: r.recipient_key,
        kind: r.kind,
        ciphertextB64: Buffer.from(r.ciphertext).toString("base64"),
        createdAt: r.created_at,
        readAt: r.read_at,
      }))
    );
  });
}
