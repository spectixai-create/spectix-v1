// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PassTimeline } from '@/components/adjuster/pass-timeline';
import type { Pass } from '@/lib/types';

describe('FINAL-PREP-001 technical display cleanup', () => {
  afterEach(() => cleanup());

  it('keeps processing timeline operational while hiding LLM/cost details behind technical disclosure', () => {
    const { container } = render(<PassTimeline passes={[pass()]} />);

    expect(screen.getByText('ציר עיבוד')).toBeTruthy();
    expect(screen.getByText('Pass 1')).toBeTruthy();
    expect(screen.getByText('הושלם')).toBeTruthy();
    expect(container.textContent).not.toContain('cost_usd');
    expect(container.textContent).not.toContain('total_tokens');

    const technicalDetails = screen
      .getByText('פרטים טכניים')
      .closest('details');
    expect(technicalDetails).toBeTruthy();
    expect(technicalDetails?.textContent).toContain('עלות פנימית');
    expect(technicalDetails?.textContent).toContain('קריאות LLM');
  });
});

function pass(): Pass {
  return {
    id: 'pass-1',
    claimId: 'claim-1',
    passNumber: 1,
    status: 'completed',
    startedAt: '2026-05-11T08:00:00Z',
    completedAt: '2026-05-11T08:05:00Z',
    riskBand: null,
    findingsCount: 0,
    gapsCount: 0,
    llmCallsMade: 3,
    costUsd: 0.12,
    createdAt: '2026-05-11T08:00:00Z',
  };
}
