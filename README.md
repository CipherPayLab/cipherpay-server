# node 20
```bash
nvm use 20
```

# cipherpay-server
backend server for playform cipherpay, working with frontend cipherpay-ui

# DB up (from your compose)
docker compose up -d db
# note: the above will migrate src/db/migrations/001_init.sql

# Generate Prisma client (schema matches the SQL above)
npx prisma generate

# Start server
npm run dev

# Test
curl -s http://127.0.0.1:8788/healthz
