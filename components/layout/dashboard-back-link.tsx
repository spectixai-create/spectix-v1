import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function DashboardBackLink() {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/overview" prefetch={false}>
        חזרה לדשבורד
      </Link>
    </Button>
  );
}
