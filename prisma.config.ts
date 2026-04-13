import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// DIRECT_URL is required for migrations (port 5432, bypasses PgBouncer).
// Falls back to a placeholder so `prisma generate` works without credentials.
// Set DIRECT_URL in .env before running `prisma migrate deploy` or `prisma db push`.
const directUrl = process.env.DIRECT_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: directUrl,
  },
})
