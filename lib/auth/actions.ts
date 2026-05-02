'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient as createServerClient } from '@/lib/supabase/server';
import type { ApiResult } from '@/lib/types';

export async function signIn(
  email: string,
  password: string,
): Promise<ApiResult<{ userId: string }>> {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const lowerMessage = error.message.toLowerCase();
    const code = lowerMessage.includes('invalid')
      ? 'invalid_credentials'
      : lowerMessage.includes('rate')
        ? 'rate_limited'
        : 'auth_error';

    return {
      ok: false,
      error: { code, message: error.message },
    };
  }

  revalidatePath('/', 'layout');

  return { ok: true, data: { userId: data.user.id } };
}

export async function signOut(): Promise<void> {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
