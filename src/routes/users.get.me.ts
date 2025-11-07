import { FastifyInstance } from "fastify";

export default async function (app: FastifyInstance) {
  app.get("/users/me", { preHandler: app.auth }, async (req, rep) => {
    // @ts-ignore
    const payload = req.user as { sub: string; ownerKey: string };
    return rep.send({ id: payload.sub, ownerKey: payload.ownerKey });
  });
}
