#!/usr/bin/env tsx
/**
 * Seed 4 demo coding challenges directly into DB for local demo.
 * DOES NOT load from GitHub repo — this is for local click-through only.
 *
 * Usage: npx tsx scripts/seed-coding-demo.ts
 * Remove: npx tsx scripts/seed-coding-demo.ts --purge
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CHALLENGES = [
  {
    slug: 'demo-sum',
    title: 'Sum of Integers',
    language: 'python',
    difficulty: 'easy',
    description: '# Sum of Integers\n\nGiven two integers on stdin (space-separated), print their sum.\n\n## Example\n\nInput:\n```\n3 4\n```\n\nOutput:\n```\n7\n```',
    skillSlug: 'python',
    testCases: [
      { stdin: '3 4\n', expectedStdout: '7\n', isHidden: false, orderIndex: 0, weight: 1 },
      { stdin: '10 20\n', expectedStdout: '30\n', isHidden: false, orderIndex: 1, weight: 1 },
      { stdin: '-5 5\n', expectedStdout: '0\n', isHidden: true, orderIndex: 2, weight: 1 },
      { stdin: '100 200\n', expectedStdout: '300\n', isHidden: true, orderIndex: 3, weight: 1 },
    ],
  },
  {
    slug: 'demo-fizzbuzz',
    title: 'FizzBuzz',
    language: 'python',
    difficulty: 'easy',
    description: '# FizzBuzz\n\nRead an integer N from stdin. Print numbers 1 to N. For multiples of 3 print "Fizz", for multiples of 5 print "Buzz", for both print "FizzBuzz".\n\n## Example\n\nInput: `5`\n\nOutput:\n```\n1\n2\nFizz\n4\nBuzz\n```',
    skillSlug: 'python',
    testCases: [
      { stdin: '5\n', expectedStdout: '1\n2\nFizz\n4\nBuzz\n', isHidden: false, orderIndex: 0, weight: 1 },
      { stdin: '3\n', expectedStdout: '1\n2\nFizz\n', isHidden: false, orderIndex: 1, weight: 1 },
      { stdin: '15\n', expectedStdout: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n', isHidden: true, orderIndex: 2, weight: 1 },
    ],
  },
  {
    slug: 'demo-select-all',
    title: 'SELECT All Users',
    language: 'sql',
    difficulty: 'easy',
    description: '# SELECT all users\n\nA `users` table exists with columns `id`, `name`, `age`. Write a query that returns all rows ordered by `id`.\n\n_Note: wrap your query between the sentinel markers (the starter code does this automatically)._',
    skillSlug: 'sql',
    testCases: [
      {
        stdin: "CREATE TABLE users (id INTEGER, name TEXT, age INTEGER);\nINSERT INTO users VALUES (1, 'Ada', 42);\nINSERT INTO users VALUES (2, 'Bob', 30);\nSELECT '---BEGIN-ANSWER---';\nSELECT * FROM users ORDER BY id;\nSELECT '---END-ANSWER---';\n",
        expectedStdout: "1|Ada|42\n2|Bob|30\n",
        isHidden: false,
        orderIndex: 0,
        weight: 1,
      },
    ],
  },
  {
    slug: 'demo-reverse',
    title: 'Reverse a String',
    language: 'python',
    difficulty: 'medium',
    description: '# Reverse a String\n\nRead a line from stdin. Print it reversed.\n\n## Example\n\nInput: `hello`\n\nOutput: `olleh`',
    skillSlug: 'python',
    testCases: [
      { stdin: 'hello\n', expectedStdout: 'olleh\n', isHidden: false, orderIndex: 0, weight: 1 },
      { stdin: 'world\n', expectedStdout: 'dlrow\n', isHidden: false, orderIndex: 1, weight: 1 },
      { stdin: 'a\n', expectedStdout: 'a\n', isHidden: true, orderIndex: 2, weight: 0.5 },
      { stdin: 'racecar\n', expectedStdout: 'racecar\n', isHidden: true, orderIndex: 3, weight: 1 },
    ],
  },
];

async function main() {
  const purge = process.argv.includes('--purge');
  const slugs = CHALLENGES.map((c) => c.slug);

  if (purge) {
    const deleted = await prisma.codingChallenge.deleteMany({ where: { slug: { in: slugs } } });
    console.log(`Purged ${deleted.count} demo challenges`);
    return;
  }

  for (const c of CHALLENGES) {
    const existing = await prisma.codingChallenge.findUnique({ where: { slug: c.slug } });
    if (existing) {
      console.log(`- skip ${c.slug} (already exists)`);
      continue;
    }
    await prisma.codingChallenge.create({
      data: {
        slug: c.slug,
        title: c.title,
        language: c.language,
        difficulty: c.difficulty,
        description: c.description,
        skillSlug: c.skillSlug,
        testCases: { create: c.testCases },
      },
    });
    console.log(`✓ seeded ${c.slug} (${c.language}/${c.difficulty}) — ${c.testCases.length} test cases`);
  }
  console.log(`\nDone. Visit http://localhost:3000/coding to see them.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
