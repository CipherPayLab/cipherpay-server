import { FastifyInstance } from "fastify";
import { z } from "zod";

const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:3000";
const RELAYER_TOKEN = process.env.RELAYER_TOKEN || process.env.API_TOKEN || "";

export default async function (app: FastifyInstance) {
  app.post("/api/v1/submit/deposit", async (req, rep) => {
    const body = z
      .object({
        operation: z.string().optional(),
        amount: z.number().or(z.string()),
        tokenMint: z.string(),
        proof: z.any().optional(),
        publicSignals: z.array(z.string()).optional(),
        proofBytes: z.string().optional(),
        publicInputsBytes: z.string().optional(),
        depositHash: z.string().optional(),
        commitment: z.string().optional(),
        memo: z.number().optional(),
        sourceOwner: z.string().optional(),
        sourceTokenAccount: z.string().optional(),
        useDelegate: z.boolean().optional(),
      })
      .parse(req.body);

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (RELAYER_TOKEN) {
        headers.authorization = `Bearer ${RELAYER_TOKEN}`;
      }

      const response = await fetch(`${RELAYER_URL}/api/v1/submit/deposit`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        return rep.status(response.status).send({
          ok: false,
          error: "RelayerError",
          message: text,
        });
      }

      const data = await response.json();
      return rep.send(data);
    } catch (error: any) {
      app.log.error(error);
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}

