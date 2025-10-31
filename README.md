# cipherpay-server
backend server for playform cipherpay, working with frontend cipherpay-ui

# DB up (from your compose)
docker compose up -d

# Generate Prisma client (schema matches the SQL above)
npm run prisma:gen

# Start server
npm run dev

# Test
curl -s http://127.0.0.1:8788/healthz
