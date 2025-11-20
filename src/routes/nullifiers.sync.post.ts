// API endpoint to sync nullifiers with on-chain state
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { syncUserNullifiers, syncNullifier, isNullifierSpent } from "../services/nullifiers.js";

export default async function (app: FastifyInstance) {
  // Sync all nullifiers for the authenticated user
  app.post("/api/v1/nullifiers/sync", { preHandler: app.auth }, async (req, rep) => {
    try {
      // @ts-ignore
      const payload = req.user as { sub: string; ownerKey: string };
      
      const result = await syncUserNullifiers(payload.ownerKey);
      
      return rep.send({
        ok: true,
        synced: result.synced,
        failed: result.failed,
        message: `Synced ${result.synced} nullifiers, ${result.failed} failed`,
      });
    } catch (error: any) {
      app.log.error(error);
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });

  // Sync a specific nullifier
  app.post("/api/v1/nullifiers/sync/:nullifierHex", { preHandler: app.auth }, async (req, rep) => {
    try {
      const params = z
        .object({
          nullifierHex: z.string().regex(/^[0-9a-fA-F]{64}$/),
        })
        .parse(req.params);

      const nullifierBytes = Buffer.from(params.nullifierHex, "hex");
      const success = await syncNullifier(nullifierBytes);

      if (success) {
        return rep.send({
          ok: true,
          message: "Nullifier synced successfully",
        });
      } else {
        return rep.status(400).send({
          ok: false,
          error: "SyncFailed",
          message: "Failed to sync nullifier (account may not exist or invalid)",
        });
      }
    } catch (error: any) {
      app.log.error(error);
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });

  // Check if a nullifier is spent
  app.get("/api/v1/nullifiers/check/:nullifierHex", { preHandler: app.auth }, async (req, rep) => {
    try {
      const params = z
        .object({
          nullifierHex: z.string().regex(/^[0-9a-fA-F]{64}$/),
        })
        .parse(req.params);

      const query = z
        .object({
          checkOnChain: z.string().optional().transform((val) => val === "true"),
        })
        .parse(req.query);

      const spent = await isNullifierSpent(params.nullifierHex, query.checkOnChain || false);

      return rep.send({
        ok: true,
        nullifierHex: params.nullifierHex,
        spent,
      });
    } catch (error: any) {
      app.log.error(error);
      return rep.status(500).send({
        ok: false,
        error: "InternalError",
        message: error?.message || String(error),
      });
    }
  });
}

