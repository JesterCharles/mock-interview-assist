/**
 * Set user_metadata.role on a Supabase auth user.
 *
 * Usage:
 *   npx tsx scripts/seed-role.ts <email> <role>
 *
 * Examples:
 *   npx tsx scripts/seed-role.ts admin@example.com admin
 *   npx tsx scripts/seed-role.ts trainer@example.com trainer
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [, , email, role] = process.argv;

if (!email || !role) {
  console.error('Usage: npx tsx scripts/seed-role.ts <email> <role>');
  console.error('Roles: admin | trainer | associate');
  process.exit(1);
}

if (!['admin', 'trainer', 'associate'].includes(role)) {
  console.error(`Invalid role: "${role}". Must be admin, trainer, or associate.`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) {
  console.error('Failed to list users:', listErr.message);
  process.exit(1);
}

const user = users.users.find((u) => u.email === email);
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, {
  user_metadata: { ...user.user_metadata, role },
});

if (error) {
  console.error('Failed to update:', error.message);
  process.exit(1);
}

console.log(`Set ${email} → role: ${role} (user_id: ${user.id})`);
