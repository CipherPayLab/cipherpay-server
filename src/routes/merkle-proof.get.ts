import { FastifyInstance } from "fastify";
import { z } from "zod";
import fetch from "node-fetch";

const RELAYER_URL = process.env.RELAYER_URL; // e.g., http://localhost:8789

export default async function (app: FastifyInstance) {
  app.get("/merkle-proof", async (req, rep) => {
    const q = z
      .object({
        index: z.coerce.number().int().nonnegative().optional(),
        commitment: z
          .string()
          .regex(/^0x[0-9a-fA-F]+$/)
          .optional(),
      })
      .parse(req.query);

    if (!RELAYER_URL)
      return rep.code(501).send({ error: "relayer_not_configured" });

    const url = new URL(`${RELAYER_URL}/merkle-proof`);
    if (q.index !== undefined) url.searchParams.set("index", String(q.index));
    if (q.commitment) url.searchParams.set("commitment", q.commitment);

    const r = await fetch(url.toString());
    const json = await r.json();
    return rep.send(json);
  });
}
