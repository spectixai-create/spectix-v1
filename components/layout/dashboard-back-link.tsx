import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function DashboardBackLink() {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/dashboard" prefetch={false}>
        חזרה לדשבורד
      </Link>
    </Button>
  );
}
