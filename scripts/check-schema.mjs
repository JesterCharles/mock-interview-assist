import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tables = await prisma.$queryRaw`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' ORDER BY table_name;`;
console.log('TABLES:', tables.map(t=>t.table_name).join(', '));

const sessionCols = await prisma.$queryRaw`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Session'
  ORDER BY ordinal_position;`;
console.log('\nSession columns:');
sessionCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, null=${c.is_nullable}, dflt=${c.column_default})`));

const assocCols = await prisma.$queryRaw`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Associate'
  ORDER BY ordinal_position;`;
console.log('\nAssociate columns:');
assocCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, null=${c.is_nullable})`));

const mig = await prisma.$queryRaw`SELECT to_regclass('public._prisma_migrations')::text as t;`;
console.log('\n_prisma_migrations:', mig[0].t);

try {
  const nullMode = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM "Session" WHERE "mode" IS NULL;`;
  console.log('Sessions with NULL mode:', nullMode[0].c);
} catch (e) {
  console.log('Session.mode does NOT exist yet:', e.message.split('\n')[0]);
}

const totalSessions = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM "Session";`;
console.log('Total sessions:', totalSessions[0].c);

const assocTotal = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM "Associate";`;
console.log('Total associates:', assocTotal[0].c);

try {
  const cohortNull = await prisma.$queryRaw`SELECT COUNT(*)::int as c FROM "Associate" WHERE "cohortId" IS NULL;`;
  console.log('Associates with NULL cohortId:', cohortNull[0].c);
} catch (e) {
  console.log('Associate.cohortId does NOT exist yet:', e.message.split('\n')[0]);
}

await prisma.$disconnect();
await pool.end();
