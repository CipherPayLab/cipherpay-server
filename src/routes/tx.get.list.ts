import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

export default async function (app: FastifyInstance) {
  app.get("/transactions", async (req, rep) => {
    const q = z
      .object({
        owner: z
          .string()
          .regex(/^0x[0-9a-fA-F]+$/)
          .optional(),
        kind: z.enum(["deposit", "transfer", "withdraw"]).optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        cursor: z.coerce.bigint().optional(),
      })
      .parse(req.query);

    const where: any = {};
    if (q.kind)
      where.event = q.kind[0].toUpperCase() + q.kind.slice(1) + "Completed";
    if (q.owner)
      where.OR = [{ recipient_key: q.owner }, { sender_key: q.owner }];

    const rows = await prisma.tx.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: q.limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    return rep.send(rows);
  });
}
