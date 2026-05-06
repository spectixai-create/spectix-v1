'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import { ADJUSTER_ACTIONS } from '@/lib/ui/strings-he';
import { Button } from '@/components/ui/button';

export function RefreshButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      onClick={() => router.refresh()}
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      {ADJUSTER_ACTIONS.refresh}
    </Button>
  );
}
