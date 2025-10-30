import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import crypto from "node:crypto";

export default async function (app: FastifyInstance) {
  app.post("/auth/challenge", async (req, rep) => {
    const body = z
      .object({
        ownerKey: z.string().regex(/^0x[0-9a-fA-F]+$/),
        authPubKey: z.object({ x: z.string(), y: z.string() }).optional(),
      })
      .parse(req.body);

    let user = await prisma.users.findUnique({
      where: { owner_key: body.ownerKey },
    });
    if (!user) {
      if (!body.authPubKey)
        return rep.code(400).send({ error: "missing_authPubKey_for_new_user" });
      user = await prisma.users.create({
        data: {
          owner_key: body.ownerKey,
          auth_pub_x: body.authPubKey.x,
          auth_pub_y: body.authPubKey.y,
        },
      });
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.sessions.create({
      data: { user_id: user.id, nonce, expires_at: expiresAt },
    });

    return rep.send({ nonce, expiresAt: expiresAt.toISOString() });
  });
}
