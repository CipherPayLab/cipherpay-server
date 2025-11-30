import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

/**
 * GET /api/v1/users/note-enc-pub-key/:ownerCipherPayPubKey
 * Returns the note_enc_pub_key for a given owner_cipherpay_pub_key
 * This is used by senders to get the recipient's note encryption public key
 */
export default async function (app: FastifyInstance) {
  app.get("/api/v1/users/note-enc-pub-key/:ownerCipherPayPubKey", async (req, rep) => {
    const params = z.object({
      ownerCipherPayPubKey: z.string().regex(/^0x[0-9a-fA-F]+$/, "ownerCipherPayPubKey must be 0x-hex"),
    }).parse(req.params);

    const user = await prisma.users.findUnique({
      where: { owner_cipherpay_pub_key: params.ownerCipherPayPubKey },
      select: { note_enc_pub_key: true },
    });

    if (!user) {
      return rep.code(404).send({ error: "User not found" });
    }

    if (!user.note_enc_pub_key) {
      return rep.code(404).send({ error: "Note encryption public key not found for this user" });
    }

    return rep.send({ noteEncPubKey: user.note_enc_pub_key });
  });
}

