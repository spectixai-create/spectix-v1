import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  formatRelativeDaysAgo,
  formatRelativeHoursAgo,
} from '@/lib/ui/hebrew-time';
import { getClaimTypeLabel } from '@/lib/ui/strings-he';
import { getUserInitials } from '@/lib/ui/user-identity';

describe('UI-003 Part 3 demo-readiness helpers', () => {
  const now = new Date('2026-05-06T12:00:00Z');

  it('formats Hebrew relative day and hour labels without broken plurals', () => {
    expect(formatRelativeDaysAgo('2026-05-06T10:00:00Z', now)).toBe('היום');
    expect(formatRelativeDaysAgo('2026-05-05T12:00:00Z', now)).toBe('לפני יום');
    expect(formatRelativeDaysAgo('2026-05-04T12:00:00Z', now)).toBe(
      'לפני יומיים',
    );
    expect(formatRelativeDaysAgo('2026-05-03T12:00:00Z', now)).toBe(
      'לפני 3 ימים',
    );
    expect(formatRelativeHoursAgo('2026-05-06T11:00:00Z', now)).toBe(
      'לפני שעה',
    );
  });

  it('renders canonical Hebrew claim type labels', () => {
    expect(getClaimTypeLabel('theft')).toBe('גניבה');
    expect(getClaimTypeLabel('flight_delay')).toBe('עיכוב טיסה');
    expect(getClaimTypeLabel('liability')).toBe('אחריות צד ג׳');
    expect(getClaimTypeLabel('unknown')).toBe('לא סווג');
  });

  it('derives header initials without exposing the raw email by default', () => {
    expect(getUserInitials('adjuster.demo@spectix.test')).toBe('AD');
    expect(getUserInitials('vov@spectix.test')).toBe('VO');
  });
});

describe('UI-003 Part 3 source-level regressions', () => {
  it('keeps authenticated navigation free of the design-system link', () => {
    const source = readFileSync(
      'components/layout/adjuster-shell-client.tsx',
      'utf8',
    );

    expect(source).not.toContain('/design-system');
    expect(source).not.toContain('Design system');
    expect(source).not.toContain('title={email}');
    expect(source).not.toContain('{email}</span>');
  });

  it('keeps demo-exposed authenticated footers clean by default', () => {
    for (const file of [
      'app/(adjuster)/dashboard/page.tsx',
      'app/(adjuster)/questions/page.tsx',
      'app/(adjuster)/claim/[id]/page.tsx',
      'app/design-system/page.tsx',
    ]) {
      expect(readFileSync(file, 'utf8')).not.toContain(
        'VersionFooter internal',
      );
    }
  });

  it('adds dashboard risk band, KPI, question action, and tab counters', () => {
    expect(
      readFileSync('components/adjuster/claims-list-table.tsx', 'utf8'),
    ).toContain('רמת סיכון');
    expect(readFileSync('app/(adjuster)/dashboard/page.tsx', 'utf8')).toContain(
      'DashboardKpiRow',
    );
    expect(
      readFileSync('components/questions/question-card.tsx', 'utf8'),
    ).toContain('פתח תיק');
    expect(
      readFileSync('components/adjuster/claim-brief-tabs.tsx', 'utf8'),
    ).toContain('TabLabel');
    expect(
      readFileSync('components/questions/questions-view.tsx', 'utf8'),
    ).toContain('tabCounts');
  });
});
