#!/usr/bin/env tsx

/**
 * Idempotent adjuster seed script.
 *
 * Usage: npx tsx scripts/seed/create-adjuster.ts <email> <password>
 *
 * email_confirm: true bypasses email verification.
 * Acceptable for POC where ops manually creates known adjusters.
 * For production deployment with external users, remove this flag
 * or add proper verification flow.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

loadEnvLocal();

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) return;

    process.env[key] = value.replace(/^['"]|['"]$/g, '');
  });
}

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error(
      'Usage: tsx scripts/seed/create-adjuster.ts <email> <password>',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL in environment.');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: existing, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const found = existing?.users.find((user) => user.email === email);

  if (found) {
    console.log(`User already exists: ${email} (id: ${found.id})`);
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      password,
    });

    if (error) {
      console.error('Failed to update password:', error.message);
      process.exit(1);
    }

    console.log('Password updated.');
    process.exit(0);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('Failed to create user:', error.message);
    process.exit(1);
  }

  console.log(`Created adjuster: ${email} (id: ${data.user.id})`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
