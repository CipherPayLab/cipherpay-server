import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createClient } from "redis";

export default async function (app: FastifyInstance) {
  app.get("/stream", async (req, rep) => {
    const q = z
      .object({ recipientKey: z.string().regex(/^0x[0-9a-fA-F]+$/) })
      .parse(req.query);
    rep.headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    rep.raw.flushHeaders?.();

    const sub = app.redisSub ?? createClient();
    if (!app.redisSub) {
      await sub.connect();
      // @ts-ignore
      app.redisSub = sub;
    }
    await sub.subscribe(`inbox:${q.recipientKey}`, (msg) => {
      rep.raw.write(`event: message\ndata: ${msg}\n\n`);
    });

    req.raw.on("close", async () => {
      try {
        await sub.unsubscribe(`inbox:${q.recipientKey}`);
      } catch {}
      rep.raw.end();
    });
  });
}

declare module "fastify" {
  interface FastifyInstance {
    redis?: any;
    redisSub?: any;
  }
}
