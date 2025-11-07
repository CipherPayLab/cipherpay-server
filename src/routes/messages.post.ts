import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { computeContentHash } from "../services/crypto.js";
import { KnownKindsZ } from "../validation/sdk.js";

/**
 * POST /messages
 * Body:
 *  - recipientKey: 0x... (ownerCipherPayPubKey of recipient)
 *  - ciphertextB64: base64-encoded encrypted envelope (opaque to server)
 *  - kind: "note-transfer" | "note-deposit" | "note-message"
 *  - senderKey?: 0x... (optional, sender's ownerCipherPayPubKey)
 *
 * Returns:
 *  - { id, contentHash }
 */
export default async function (app: FastifyInstance) {
  app.post("/messages", async (req, rep) => {
    const BodyZ = z.object({
      recipientKey: z.string().regex(/^0x[0-9a-fA-F]+$/, "recipientKey must be 0x-hex"),
      ciphertextB64: z.string().min(1, "ciphertextB64 required"),
      kind: KnownKindsZ.default("note-transfer"),
      senderKey: z.string().regex(/^0x[0-9a-fA-F]+$/).optional(),
    });

    const body = BodyZ.parse(req.body);
    const ciphertext = Buffer.from(body.ciphertextB64, "base64");

    // Use cipherpay-sdk (via services/crypto) to compute deterministic content hash
    const h = await computeContentHash(body.recipientKey as `0x${string}`, ciphertext);

    try {
      const row = await prisma.messages.create({
        data: {
          recipient_key: body.recipientKey,
          sender_key: body.senderKey ?? null,
          ciphertext,
          kind: body.kind,
          content_hash: h,
        },
        select: { id: true },
      });

      // (Optional) publish SSE/Redis here if you wired it
      return rep.send({ id: row.id, contentHash: h });
    } catch (e: any) {
      // Prisma unique constraint (content_hash) => duplicate message
      if (e.code === "P2002") return rep.code(409).send({ error: "duplicate_message" });
      throw e;
    }
  });
}
