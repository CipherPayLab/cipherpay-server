import { FastifyInstance } from "fastify";
import { getUserWsolAta, getUserSolanaWallet, getAllUserAtas } from "../services/userAta.js";

export default async function (app: FastifyInstance) {
  app.get("/users/me", { preHandler: app.auth }, async (req, rep) => {
    // @ts-ignore
    const payload = req.user as { sub: string; ownerKey: string };
    
    // Get stored ATAs and wallet address from DB
    const solanaWallet = await getUserSolanaWallet(payload.ownerKey);
    const allAtas = await getAllUserAtas(payload.ownerKey);
    const wsolAta = await getUserWsolAta(payload.ownerKey); // For backward compatibility
    
    return rep.send({ 
      id: payload.sub, 
      ownerKey: payload.ownerKey,
      solanaWalletAddress: solanaWallet,
      wsolAta: wsolAta, // Backward compatibility
      atas: allAtas, // All ATAs: { "So111...": "ATA_ADDRESS", ... }
    });
  });
}
