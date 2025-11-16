import { FastifyInstance } from "fastify";

const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:3000";
const RELAYER_TOKEN = process.env.RELAYER_TOKEN || process.env.API_TOKEN || "";

export default async function (app: FastifyInstance) {
  app.get("/api/relayer/info", async (req, rep) => {
    try {
      const headers: Record<string, string> = {};
      if (RELAYER_TOKEN) {
        headers.authorization = `Bearer ${RELAYER_TOKEN}`;
      }

      const response = await fetch(`${RELAYER_URL}/api/v1/relayer/info`, {
        method: "GET",
        headers,
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

