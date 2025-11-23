import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { computeContentHash } from "../services/crypto.js";
import { KnownKindsZ } from "../validation/sdk.js";

/**
 * POST /api/v1/messages
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
  app.post("/api/v1/messages", { preHandler: app.auth }, async (req, rep) => {
    // @ts-ignore
    const payload = req.user as { ownerKey: string };
    const authenticatedOwnerKey = payload.ownerKey;

    const BodyZ = z.object({
      recipientKey: z.string().regex(/^0x[0-9a-fA-F]+$/, "recipientKey must be 0x-hex"),
      ciphertextB64: z.string().min(1, "ciphertextB64 required"),
      kind: KnownKindsZ.default("note-transfer"),
      senderKey: z.string().regex(/^0x[0-9a-fA-F]+$/).optional(),
    });

    const body = BodyZ.parse(req.body);
    
    req.log.info({
      authenticatedOwnerKey,
      recipientKey: body.recipientKey,
      senderKey: body.senderKey,
      kind: body.kind,
    }, "[messages.post] Saving message");
    
    // For deposit notes, recipientKey should match authenticated user
    // Use authenticated user's ownerKey to ensure messages can be retrieved
    let finalRecipientKey = body.recipientKey;
    if (body.kind === "note-deposit") {
      if (body.recipientKey !== authenticatedOwnerKey) {
        req.log.warn({
          authenticatedOwnerKey,
          recipientKey: body.recipientKey,
        }, "[messages.post] Deposit note recipientKey doesn't match authenticated user, using authenticated ownerKey");
      }
      finalRecipientKey = authenticatedOwnerKey;
    }
    
    // Optional: Validate senderKey matches authenticated user (if provided)
    if (body.senderKey && body.senderKey !== authenticatedOwnerKey) {
      return rep.code(403).send({ error: "sender_key_mismatch" });
    }

    const ciphertext = Buffer.from(body.ciphertextB64, "base64");

    // Use cipherpay-sdk (via services/crypto) to compute deterministic content hash
    // Use finalRecipientKey for content hash to maintain consistency
    const h = await computeContentHash(finalRecipientKey as `0x${string}`, ciphertext);

    try {
      const row = await prisma.messages.create({
        data: {
          recipient_key: finalRecipientKey,
          sender_key: body.senderKey ?? null,
          ciphertext,
          kind: body.kind,
          content_hash: h,
        },
        select: { id: true },
      });

      // (Optional) publish SSE/Redis here if you wired it
      // Convert BigInt ID to string for JSON serialization
      return rep.send({ id: row.id.toString(), contentHash: h });
    } catch (e: any) {
      // Prisma unique constraint (content_hash) => duplicate message
      if (e.code === "P2002") return rep.code(409).send({ error: "duplicate_message" });
      throw e;
    }
  });
}
