import 'dotenv/config';
import { prisma as p } from '../src/lib/prisma.js';

async function main() {
  const assocs = await p.associate.findMany({
    where: { email: { not: null } },
    select: { slug: true, email: true, authUserId: true },
  });
  console.table(assocs);
  await p.$disconnect();
}

main();
