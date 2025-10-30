export const env = {
  port: Number(process.env.PORT ?? 8788),
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-change-me",
  jwtIssuer: "cipherpay-server",
  databaseUrl:
    process.env.DATABASE_URL ??
    "mysql://cipherpay:cipherpay@127.0.0.1:3307/cipherpay_server",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
