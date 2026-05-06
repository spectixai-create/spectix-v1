import { CLAIM_STATUS_LABELS } from '@/lib/ui/strings-he';
import { getClaimStatusClass } from '@/lib/ui/status-badges';
import type { ClaimStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function ClaimStatusBadge({
  status,
  className,
}: Readonly<{
  status: ClaimStatus;
  className?: string;
}>) {
  return (
    <Badge
      variant="outline"
      className={cn(getClaimStatusClass(status), className)}
    >
      {CLAIM_STATUS_LABELS[status]}
    </Badge>
  );
}
