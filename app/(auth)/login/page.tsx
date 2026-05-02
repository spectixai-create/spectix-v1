import { LoginForm, type LoginErrorState } from '@/components/auth/login-form';
import { PageShell } from '@/components/layout/page-shell';
import { getUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function getLoginErrorState(value: string | string[] | undefined) {
  if (value === 'invalid' || value === 'expired') {
    return value;
  }

  return null;
}

function getStringSearchParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : null;
}

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams?: { error?: string | string[]; next?: string | string[] };
}>) {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  }

  const errorState = getLoginErrorState(searchParams?.error);
  const nextPath = getStringSearchParam(searchParams?.next);

  return (
    <PageShell
      size="sm"
      className="flex flex-1 items-center justify-center py-10"
    >
      <LoginForm errorState={errorState} nextPath={nextPath} />
    </PageShell>
  );
}
