import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import crypto from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { setUserAta } from "../services/userAta.js";

export default async function (app: FastifyInstance) {
  app.post("/auth/challenge", async (req, rep) => {
    const body = z
      .object({
        ownerKey: z.string().regex(/^0x[0-9a-fA-F]+$/),
        authPubKey: z.object({ x: z.string(), y: z.string() }).optional(),
        solanaWalletAddress: z.string().optional(), // Optional: wallet address for ATA derivation
      })
      .parse(req.body);

    req.log.info({ 
      ownerKey: body.ownerKey.substring(0, 20) + '...',
      hasAuthPubKey: !!body.authPubKey,
      solanaWalletAddress: body.solanaWalletAddress 
    }, "Received auth challenge request");

    let user = await prisma.users.findUnique({
      where: { owner_cipherpay_pub_key: body.ownerKey },
    });
    
    // Handle new user creation
    if (!user) {
      if (!body.authPubKey) {
        return rep.code(400).send({ error: "missing_authPubKey_for_new_user" });
      }
      
      user = await prisma.users.create({
        data: {
          owner_cipherpay_pub_key: body.ownerKey,
          auth_pub_x: body.authPubKey.x,
          auth_pub_y: body.authPubKey.y,
          solana_wallet_address: body.solanaWalletAddress ?? null,
        },
      });
      
      // Save Solana wallet to user_wallets table if wallet address provided
      if (body.solanaWalletAddress) {
        try {
          req.log.info({ walletAddress: body.solanaWalletAddress }, "Processing wallet and ATA for new user");
          
          // Validate the wallet address
          const owner = new PublicKey(body.solanaWalletAddress);
          req.log.info({ owner: owner.toBase58() }, "Validated wallet address");
          
          // Check if wallet already exists for this user
          const existingWallet = await prisma.user_wallets.findFirst({
            where: {
              user_id: user.id,
              chain: "solana",
              address: body.solanaWalletAddress,
            },
          });
          
          // Create wallet record if it doesn't exist
          if (!existingWallet) {
            // Check if this is the first wallet for this user (set as primary)
            const walletCount = await prisma.user_wallets.count({
              where: { user_id: user.id, chain: "solana" },
            });
            
            req.log.info({ walletCount, isPrimary: walletCount === 0 }, "Creating wallet record");
            
            const walletRecord = await prisma.user_wallets.create({
              data: {
                user_id: user.id,
                chain: "solana",
                address: body.solanaWalletAddress,
                label: "Primary Wallet",
                is_primary: walletCount === 0, // First wallet is primary
                verified: false, // Will be verified later if needed
              },
            });
            
            req.log.info({ walletId: walletRecord.id }, "Wallet record created successfully");
          } else {
            req.log.info({ walletId: existingWallet.id }, "Wallet already exists, skipping creation");
          }
          
          // Derive and store WSOL ATA
          const ata = getAssociatedTokenAddressSync(NATIVE_MINT, owner, false);
          const ataAddress = ata.toBase58();
          req.log.info({ ataAddress, tokenMint: NATIVE_MINT.toBase58() }, "Derived ATA, saving to database");
          
          await setUserAta(user.id, NATIVE_MINT.toBase58(), ataAddress);
          req.log.info({ userId: user.id.toString() }, "ATA saved successfully");
        } catch (error: any) {
          req.log.error({ error: error?.message || error, stack: error?.stack }, "Failed to save wallet and ATA for new user");
          // Continue without storing wallet/ATA - invalid address
        }
      } else {
        req.log.info("No solanaWalletAddress provided, skipping wallet and ATA creation");
      }
    } else {
      // Update existing user if wallet address provided
      req.log.info({ 
        userId: user.id.toString(),
        hasSolanaWalletAddress: !!body.solanaWalletAddress,
        solanaWalletAddress: body.solanaWalletAddress,
      }, "Processing existing user with wallet address");
      
      if (body.solanaWalletAddress) {
        try {
          req.log.info({ walletAddress: body.solanaWalletAddress }, "Processing wallet and ATA for existing user");
          
          // Validate the wallet address
          const owner = new PublicKey(body.solanaWalletAddress);
          req.log.info({ owner: owner.toBase58() }, "Validated wallet address for existing user");
          
          // Check if wallet already exists for this user
          const existingWallet = await prisma.user_wallets.findFirst({
            where: {
              user_id: user.id,
              chain: "solana",
              address: body.solanaWalletAddress,
            },
          });
          
          // Create wallet record if it doesn't exist
          if (!existingWallet) {
            // Check if this is the first wallet for this user (set as primary)
            const walletCount = await prisma.user_wallets.count({
              where: { user_id: user.id, chain: "solana" },
            });
            
            req.log.info({ walletCount, isPrimary: walletCount === 0 }, "Creating wallet record for existing user");
            
            const walletRecord = await prisma.user_wallets.create({
              data: {
                user_id: user.id,
                chain: "solana",
                address: body.solanaWalletAddress,
                label: "Primary Wallet",
                is_primary: walletCount === 0, // First wallet is primary
                verified: false,
              },
            });
            
            req.log.info({ walletId: walletRecord.id }, "Wallet record created successfully for existing user");
          } else {
            req.log.info({ walletId: existingWallet.id }, "Wallet already exists for existing user, skipping creation");
          }
          
          // Update wallet address in users table if different
          // Note: user.solana_wallet_address might not exist in Prisma type yet, but we'll try to update it
          try {
            const currentWallet = (user as any).solana_wallet_address;
            if (currentWallet !== body.solanaWalletAddress) {
              req.log.info({ 
                old: currentWallet, 
                new: body.solanaWalletAddress 
              }, "Updating solana_wallet_address in users table");
              
              user = await prisma.users.update({
                where: { id: user.id },
                data: {
                  solana_wallet_address: body.solanaWalletAddress,
                } as any,
              });
              
              req.log.info({ userId: user.id.toString() }, "Updated solana_wallet_address successfully");
            } else {
              req.log.info("Wallet address unchanged, skipping update");
            }
          } catch (updateError: any) {
            req.log.warn({ error: updateError?.message }, "Could not update solana_wallet_address (field may not exist in Prisma type yet)");
          }
          
          // Check if WSOL ATA already exists
          const existingAta = await (prisma as any).user_atas.findUnique({
            where: {
              user_id_token_mint: {
                user_id: user.id,
                token_mint: NATIVE_MINT.toBase58(),
              },
            },
          });
          
          // Derive and store WSOL ATA if not already stored
          if (!existingAta) {
            const ata = getAssociatedTokenAddressSync(NATIVE_MINT, owner, false);
            const ataAddress = ata.toBase58();
            req.log.info({ ataAddress, tokenMint: NATIVE_MINT.toBase58() }, "Derived ATA for existing user, saving to database");
            
            await setUserAta(user.id, NATIVE_MINT.toBase58(), ataAddress);
            req.log.info({ userId: user.id.toString() }, "ATA saved successfully for existing user");
          } else {
            req.log.info({ ataAddress: existingAta.ata_address }, "ATA already exists for existing user, skipping creation");
          }
        } catch (error: any) {
          req.log.error({ error: error?.message || error, stack: error?.stack }, "Failed to save wallet and ATA for existing user");
          // Continue without storing wallet/ATA - invalid address
        }
      } else {
        req.log.info("No solanaWalletAddress provided for existing user, skipping wallet and ATA creation");
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
