'use client';

import { ExternalLink } from 'lucide-react';

import type { DocumentWithSignedUrl } from '@/lib/adjuster/types';
import {
  DOCUMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  EMPTY_STATES,
} from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function DocumentsTab({
  documents,
}: Readonly<{
  documents: DocumentWithSignedUrl[];
}>) {
  if (documents.length === 0) {
    return <EmptyState text={EMPTY_STATES.documents} />;
  }

  return (
    <div className="grid gap-3">
      {documents.map((document) => (
        <Card key={document.id}>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{document.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {DOCUMENT_LABELS[
                  document.documentSubtype ?? document.documentType
                ] ??
                  document.documentSubtype ??
                  document.documentType}{' '}
                · {formatBytes(document.fileSize)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {DOCUMENT_STATUS_LABELS[document.processingStatus]}
              </Badge>
              {document.signedUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={document.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    פתיחה
                  </a>
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled>
                  פתיחה
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatBytes(value: number | null): string {
  if (value === null) return 'גודל לא ידוע';
  return `${new Intl.NumberFormat('he-IL').format(Math.round(value / 1024))} KB`;
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
