import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { poseidonLoginMsg, verifyBabyJubSig } from "../services/crypto.js";

/**
 * POST /auth/verify
 * Body:
 *  - ownerKey: 0x... (ownerCipherPayPubKey)
 *  - nonce: hex (from /auth/challenge)
 *  - signature: { R8x, R8y, S } (BabyJub EdDSA over Poseidon(nonce || ownerKey))
 *  - authPubKey?: { x, y } (optional: if first-time binding)
 */
export default async function (app: FastifyInstance) {
  app.post("/auth/verify", async (req, rep) => {
    const BodyZ = z.object({
      ownerKey: z.string().regex(/^0x[0-9a-fA-F]+$/, "ownerKey must be 0x-hex"),
      nonce: z.string().regex(/^[0-9a-fA-F]+$/, "nonce must be hex string (no 0x)"),
      signature: z.object({
        R8x: z.string(),
        R8y: z.string(),
        S: z.string(),
      }),
      authPubKey: z.object({ x: z.string(), y: z.string() }).optional(),
    });

    const body = BodyZ.parse(req.body);

    const user = await prisma.users.findUnique({ where: { owner_cipherpay_pub_key: body.ownerKey } });
    if (!user) return rep.code(400).send({ error: "unknown_user" });

    const session = await prisma.sessions.findFirst({
      where: { user_id: user.id, nonce: body.nonce },
      orderBy: { created_at: "desc" },
    });
    if (!session || session.expires_at < new Date()) {
      return rep.code(400).send({ error: "nonce_expired_or_invalid" });
    }

    // Poseidon(nonce || ownerKey) using cipherpay-sdk (wrapped in services/crypto)
    const msgField = await poseidonLoginMsg(
      ("0x" + body.nonce) as `0x${string}`,
      body.ownerKey as `0x${string}`
    );

    const pub = body.authPubKey ?? { x: user.auth_pub_x, y: user.auth_pub_y };
    const ok = await verifyBabyJubSig({ msgField, sig: body.signature, pub });
    if (!ok) return rep.code(401).send({ error: "bad_signature" });

    // If we provisioned user without pub at challenge time, bind it now
    if (!user.auth_pub_x || !user.auth_pub_y) {
      await prisma.users.update({
        where: { id: user.id },
        data: { auth_pub_x: pub.x, auth_pub_y: pub.y },
      });
    }

    const token = app.jwt.sign(
      { sub: String(user.id), ownerKey: user.owner_cipherpay_pub_key },
      { expiresIn: "1h" }
    );

    return rep.send({ token, user: { id: user.id, ownerKey: user.owner_cipherpay_pub_key } });
  });
}
