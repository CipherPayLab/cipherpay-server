import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "../config/env.js";

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: env.jwtSecret,
  });

  app.decorate("auth", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
});

// Configure the user/payload type via @fastify/jwt module augmentation
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; ownerKey: string; id?: string };
    user: { sub: string; ownerKey: string; id?: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    auth: (req: any, rep: any) => Promise<void>;
  }
}
