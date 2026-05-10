// @vitest-environment jsdom
import { createElement, type ComponentType, type ReactNode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentsTab } from '@/components/adjuster/documents-tab';
import { DocumentUploader } from '@/components/intake/document-uploader';
import type { DocumentWithSignedUrl } from '@/lib/adjuster/types';
import type { Document } from '@/lib/types';

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  usePathname: () => '/claim/claim-1',
  useRouter: () => ({
    push: vi.fn(),
    refresh: refreshMock,
    replace: vi.fn(),
  }),
}));

vi.mock('@/components/layout/adjuster-shell', () => ({
  AdjusterShell: ({ children }: { children: ReactNode }) =>
    createElement('div', null, children),
}));

vi.mock('@/lib/auth/actions', () => ({
  signOut: vi.fn(),
}));

vi.mock('@/components/adjuster/action-panel', () => ({
  ActionPanel: () => createElement('div', null, 'actions'),
}));

vi.mock('@/components/adjuster/claims-list-table', () => ({
  ClaimsListTable: () => createElement('div', null, 'claims table'),
}));

vi.mock('@/components/adjuster/claim-brief-tabs', () => ({
  ClaimBriefTabs: () => createElement('div', null, 'tabs'),
}));

vi.mock('@/components/adjuster/claim-header', () => ({
  ClaimHeader: () => createElement('div', null, 'claim header'),
}));

vi.mock('@/components/adjuster/dashboard-kpi-row', () => ({
  DashboardKpiRow: () => createElement('div', null, 'dashboard kpis'),
}));

vi.mock('@/components/adjuster/pass-timeline', () => ({
  PassTimeline: () => createElement('div', null, 'passes'),
}));

vi.mock('@/components/adjuster/refresh-button', () => ({
  RefreshButton: () => createElement('button', { type: 'button' }, 'רענון'),
}));

vi.mock('@/components/layout/version-footer', () => ({
  VersionFooter: () => createElement('footer', null, 'Spectix'),
}));

vi.mock('@/components/questions/question-summary-stats', () => ({
  QuestionsSummaryStats: () => createElement('div', null, 'question stats'),
}));

vi.mock('@/components/questions/questions-view', () => ({
  QuestionsView: () => createElement('div', null, 'questions view'),
}));

vi.mock('@/lib/auth/server', () => ({
  requireUser: vi.fn(async () => ({ email: 'adjuster.demo@spectix.test' })),
}));

vi.mock('@/lib/adjuster/data', () => ({
  fetchClaimsList: vi.fn(async () => ({
    items: [],
    page: 1,
    pageSize: 25,
    summary: {},
    total: 0,
    totalPages: 0,
  })),
  fetchClaimDetail: vi.fn(async () => ({
    auditLog: [],
    claim: {
      id: 'claim-1',
      claimNumber: '2026-999',
    },
    documents: [],
    findings: [],
    passes: [],
    questions: [],
    readinessScore: null,
    synthesisResults: [],
    validations: [],
  })),
}));

describe('document upload status polish', () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the ready label when polling confirms the document was processed', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            data: { document: documentRow({ processingStatus: 'pending' }) },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            data: {
              documentId: 'doc-1',
              document_type: 'receipt',
              processing_status: 'processed',
            },
          }),
        ),
    );

    render(createElement(DocumentUploader, { claimId: 'claim-1' }));
    await uploadTestFile();

    expect(await screen.findByText('מוכן')).toBeTruthy();
    expect(screen.queryByText('מעבד...')).toBeNull();
  });

  it('uses a stable background-processing label when polling times out', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith('/documents')) {
          return jsonResponse({
            ok: true,
            data: { document: documentRow({ processingStatus: 'pending' }) },
          });
        }

        return jsonResponse({
          ok: true,
          data: {
            documentId: 'doc-1',
            document_type: 'receipt',
            processing_status: 'pending',
          },
        });
      }),
    );

    render(createElement(DocumentUploader, { claimId: 'claim-1' }));
    await uploadTestFile();

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('המסמך נקלט ונמצא בעיבוד')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    expect(screen.getByText('המסמך נקלט, העיבוד ימשיך ברקע')).toBeTruthy();
    expect(screen.queryByText('מעבד...')).toBeNull();
  });
});

describe('claim document upload access', () => {
  afterEach(() => {
    cleanup();
    refreshMock.mockClear();
  });

  it('exposes an add-document action and reveals the existing uploader', () => {
    render(
      createElement(DocumentsTab, {
        claimId: 'claim-1',
        documents: [],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'הוסף מסמך' }));

    expect(screen.getByLabelText('אזור העלאת מסמכים תומכים')).toBeTruthy();
  });
});

describe('authenticated dashboard navigation', () => {
  afterEach(() => cleanup());

  it('renders the general dashboard route with internal navigation actions', async () => {
    const { default: OverviewPage } =
      await import('@/app/(adjuster)/overview/page');
    const page = await OverviewPage();

    render(page);

    expect(screen.getByRole('heading', { name: 'דשבורד' })).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'פתיחת תור עבודה' })
        .getAttribute('href'),
    ).toBe('/dashboard');
    expect(
      screen
        .getByRole('link', { name: 'פתיחת תור שאלות' })
        .getAttribute('href'),
    ).toBe('/questions');
    expect(
      screen
        .getByRole('link', { name: 'פתיחת טופס קליטה' })
        .getAttribute('href'),
    ).toBe('/new');
  });

  it('keeps the existing dashboard route as the work queue', async () => {
    const { default: DashboardPage } =
      await import('@/app/(adjuster)/dashboard/page');
    const page = await DashboardPage({ searchParams: {} });

    render(page);

    expect(screen.getByRole('heading', { name: 'תור עבודה' })).toBeTruthy();
  });

  it('adds the general dashboard to authenticated shell navigation', async () => {
    const { AdjusterShellClient } =
      await import('@/components/layout/adjuster-shell-client');
    const Shell = AdjusterShellClient as ComponentType<{
      children?: ReactNode;
      userEmail: string | null;
    }>;

    render(
      createElement(
        Shell,
        { userEmail: 'adjuster.demo@spectix.test' },
        createElement('div', null, 'content'),
      ),
    );

    expect(
      screen
        .getAllByRole('link', { name: 'דשבורד' })
        .some((link) => link.getAttribute('href') === '/overview'),
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'תור עבודה' })
        .some((link) => link.getAttribute('href') === '/dashboard'),
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'תור שאלות' })
        .some((link) => link.getAttribute('href') === '/questions'),
    ).toBe(true);
  });

  it('renders a dashboard return link on the claim detail page', async () => {
    const { default: ClaimPage } =
      await import('@/app/(adjuster)/claim/[id]/page');
    const page = await ClaimPage({ params: { id: 'claim-1' } });

    render(page);

    expect(
      screen.getByRole('link', { name: 'חזרה לדשבורד' }).getAttribute('href'),
    ).toBe('/overview');
  });

  it('renders a dashboard return link on the questions page', async () => {
    const { default: QuestionsPage } =
      await import('@/app/(adjuster)/questions/page');

    render(createElement(QuestionsPage, { searchParams: {} }));

    expect(
      screen.getByRole('link', { name: 'חזרה לדשבורד' }).getAttribute('href'),
    ).toBe('/overview');
  });
});

async function uploadTestFile() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');

  expect(input).toBeTruthy();

  await act(async () => {
    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [
          new File(['x'.repeat(256)], 'receipt.pdf', {
            type: 'application/pdf',
          }),
        ],
      },
    });
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function documentRow(overrides: Partial<Document> = {}): DocumentWithSignedUrl {
  return {
    claimId: 'claim-1',
    createdAt: '2026-05-10T00:00:00Z',
    documentSubtype: null,
    documentType: 'receipt',
    extractedData: null,
    fileName: 'receipt.pdf',
    filePath: 'claims/claim-1/receipt.pdf',
    fileSize: 256,
    id: 'doc-1',
    mimeType: 'application/pdf',
    ocrText: null,
    processingStatus: 'pending',
    responseToQuestionId: null,
    signedUrl: null,
    uploadedBy: null,
    ...overrides,
  };
}
