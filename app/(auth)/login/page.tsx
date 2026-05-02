import { LoginForm, type LoginErrorState } from '@/components/auth/login-form';
import { PageShell } from '@/components/layout/page-shell';

function getLoginErrorState(value: string | string[] | undefined) {
  if (value === 'invalid' || value === 'expired') {
    return value;
  }

  return null;
}

export default function LoginPage({
  searchParams,
}: Readonly<{
  searchParams?: { error?: string | string[] };
}>) {
  const errorState = getLoginErrorState(searchParams?.error);

  return (
    <PageShell
      size="sm"
      className="flex flex-1 items-center justify-center py-10"
    >
      <LoginForm errorState={errorState} />
    </PageShell>
  );
}
