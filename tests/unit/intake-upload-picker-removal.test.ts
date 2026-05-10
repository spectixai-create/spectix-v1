// @vitest-environment jsdom
import { createElement } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NewClaimPage from '@/app/(intake)/new/page';
import { IntakeForm } from '@/components/intake/intake-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

describe('BUGFIX-INTAKE-UPLOAD-001', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            claim: {
              id: '00000000-0000-4000-8000-000000000001',
              claimNumber: '2026-999',
            },
          },
        }),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not render the pre-submit intake document picker', () => {
    const { container } = render(
      createElement(IntakeForm, { initialDemoState: undefined }),
    );
    const renderedText = container.textContent ?? '';

    expect(renderedText).not.toContain('העלאת מסמכים');
    expect(renderedText).not.toContain('אזור העלאת מסמכים');
    expect(renderedText).not.toContain('אין קבצים שהועלו');
  });

  it('explains that documents can be uploaded after claim creation', () => {
    const { container } = render(
      createElement(NewClaimPage, { searchParams: {} }),
    );
    const renderedText = container.textContent ?? '';

    expect(renderedText).toContain(
      'לאחר קבלת מספר התיק תוכל להעלות מסמכים תומכים',
    );
    expect(renderedText).not.toContain(
      'מלא את הפרטים והעלה מסמכים ראשוניים כדי שנוכל להתחיל בבדיקת התיק',
    );
  });

  it('submits successfully and then exposes the post-submit supporting-documents uploader', async () => {
    const { container } = render(
      createElement(IntakeForm, { initialDemoState: undefined }),
    );

    setInputValue(container, 'tripStartDate', '2026-05-01');
    setInputValue(container, 'tripEndDate', '2026-05-05');
    setInputValue(container, 'incidentDate', '2026-05-03');
    fireEvent.click(screen.getByLabelText('כן, לפני יציאה לחו״ל'));
    fireEvent.click(
      screen.getByLabelText('קראתי ואני מסכים לתנאי השימוש ולמדיניות הפרטיות'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'שלח לבדיקה' }));

    await screen.findByText('התקבל. תודה.');
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    const renderedText = container.textContent ?? '';
    expect(renderedText).toContain('2026-999');
    expect(renderedText).toContain('מסמכים תומכים');
    expect(screen.getByLabelText('אזור העלאת מסמכים תומכים')).toBeTruthy();
    expect(renderedText).toContain('PDF, JPEG, PNG, HEIC עד 4 MB לקובץ');
  });
});

function setInputValue(container: HTMLElement, name: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(
    `input[name="${name}"]`,
  );

  expect(input).toBeTruthy();
  fireEvent.change(input as HTMLInputElement, { target: { value } });
}
