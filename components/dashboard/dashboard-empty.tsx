import { EmptyState } from '@/components/states/empty-state';

export function DashboardEmpty() {
  return (
    <EmptyState
      preset="claims"
      actionLabel="ייבא תיקים לדמו"
      className="min-h-72"
    />
  );
}
