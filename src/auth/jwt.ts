import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "../config/env.js";

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { issuer: env.jwtIssuer },
  });

  app.decorate("auth", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    auth: (req: any, rep: any) => Promise<void>;
  }
  interface FastifyRequest {
    jwtVerify: any;
    user?: { sub: string; ownerKey: string; id: string };
  }
}
