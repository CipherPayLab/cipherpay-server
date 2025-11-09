import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import crypto from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { deriveAtaSync, NATIVE_MINT } from "@solana/spl-token";

export default async function (app: FastifyInstance) {
  app.post("/auth/challenge", async (req, rep) => {
    const body = z
      .object({
        ownerKey: z.string().regex(/^0x[0-9a-fA-F]+$/),
        authPubKey: z.object({ x: z.string(), y: z.string() }).optional(),
        solanaWalletAddress: z.string().optional(), // Optional: wallet address for ATA derivation
      })
      .parse(req.body);

    let user = await prisma.users.findUnique({
      where: { owner_cipherpay_pub_key: body.ownerKey },
    });
    
    // Handle new user creation
    if (!user) {
      if (!body.authPubKey) {
        return rep.code(400).send({ error: "missing_authPubKey_for_new_user" });
      }
      
      // Derive WSOL ATA if wallet address provided
      let wsolAta: string | null = null;
      if (body.solanaWalletAddress) {
        try {
          const owner = new PublicKey(body.solanaWalletAddress);
          const ata = deriveAtaSync(NATIVE_MINT, owner, false);
          wsolAta = ata.toBase58();
        } catch (error) {
          return rep.code(400).send({ error: "invalid_solana_wallet_address" });
        }
      }
      
      user = await prisma.users.create({
        data: {
          owner_cipherpay_pub_key: body.ownerKey,
          auth_pub_x: body.authPubKey.x,
          auth_pub_y: body.authPubKey.y,
          solana_wallet_address: body.solanaWalletAddress ?? null,
          wsol_ata: wsolAta,
        },
      });
    } else {
      // Update existing user if wallet address provided and ATA not set
      if (body.solanaWalletAddress && !user.wsol_ata) {
        try {
          const owner = new PublicKey(body.solanaWalletAddress);
          const ata = deriveAtaSync(NATIVE_MINT, owner, false);
          const wsolAta = ata.toBase58();
          user = await prisma.users.update({
            where: { id: user.id },
            data: {
              solana_wallet_address: body.solanaWalletAddress,
              wsol_ata: wsolAta,
            },
          });
        } catch (error) {
          req.log.warn({ error }, "Failed to derive WSOL ATA for existing user");
          // Continue without updating - invalid address
        }
      }
    }
    
    // Verify existing user has auth pub key (required)
    if (user && (!user.auth_pub_x || !user.auth_pub_y)) {
      return rep.code(400).send({ error: "user_missing_auth_pub_key" });
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.sessions.create({
      data: { user_id: user.id, nonce, expires_at: expiresAt },
    });

    return rep.send({ nonce, expiresAt: expiresAt.toISOString() });
  });
}
