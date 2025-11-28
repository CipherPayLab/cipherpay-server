import Fastify from "fastify";
import cors from "@fastify/cors";
import rate from "@fastify/rate-limit";
import jwt from "./auth/jwt.js";
import { env } from "./config/env.js";
import { eventListener } from "./services/eventListener.js";

// Routes
import authChallenge from "./routes/auth.challenge.js";
import authVerify from "./routes/auth.verify.js";
import messagesPost from "./routes/messages.post.js";
import messagesInbox from "./routes/messages.inbox.js";
import streamSse from "./routes/stream.sse.js";

// add imports
import usersMe from "./routes/users.get.me.js";
import txList from "./routes/tx.get.list.js";
import commitmentsPost from "./routes/commitments.post.js";
import merkleProofGet from "./routes/merkle-proof.get.js";
import depositPrepare from "./routes/deposit.prepare.post.js";
import depositSubmit from "./routes/deposit.submit.post.js";
import transferPrepare from "./routes/transfer.prepare.post.js";
import transferSubmit from "./routes/transfer.submit.post.js";
import nullifiersSync from "./routes/nullifiers.sync.post.js";
import accountOverview from "./routes/account.overview.post.js";
import messagesGet from "./routes/messages.get.js";
import relayerInfo from "./routes/relayer.info.get.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.corsOrigin, credentials: true });
await app.register(rate, { max: 100, timeWindow: "1 minute" });
await app.register(jwt);

app.get("/healthz", async () => ({ ok: true }));

await app.register(authChallenge);
await app.register(authVerify);
await app.register(messagesPost);
await app.register(messagesInbox);
await app.register(streamSse);

// register
await app.register(usersMe);
await app.register(txList);
await app.register(commitmentsPost);
await app.register(merkleProofGet);
await app.register(depositPrepare);
await app.register(depositSubmit);
await app.register(transferPrepare);
await app.register(transferSubmit);
await app.register(nullifiersSync);
await app.register(accountOverview);
await app.register(messagesGet);
await app.register(relayerInfo);

// Start on-chain event monitoring
eventListener.start().catch((err) => {
  app.log.error({ err }, "Failed to start event listener");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  app.log.info("SIGTERM received, shutting down gracefully...");
  await eventListener.stop();
  await app.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  app.log.info("SIGINT received, shutting down gracefully...");
  await eventListener.stop();
  await app.close();
  process.exit(0);
});

app
  .listen({ port: env.port, host: "0.0.0.0" })
  .then((addr) => app.log.info(`cipherpay-server listening on ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
