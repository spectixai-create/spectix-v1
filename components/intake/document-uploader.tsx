'use client';

import * as React from 'react';
import { FileUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type {
  Document,
  DocumentProcessingStatus,
  DocumentType,
} from '@/lib/types';
import {
  convertHeicToJpeg,
  DOCUMENT_UPLOAD_ACCEPT,
  isHeicFile,
} from '@/lib/upload/heic';

type UploadStatus =
  | 'queued'
  | 'converting'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error';

type UploadEntry = {
  id: string;
  fileName: string;
  status: UploadStatus;
  error?: string;
};

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: 'ממתין להעלאה',
  converting: 'ממיר תמונה...',
  uploading: 'מעלה...',
  processing: 'מעבד...',
  success: 'מוכן',
  error: 'נכשל',
};

export function DocumentUploader({
  claimId,
  onUploadComplete,
}: Readonly<{
  claimId: string;
  onUploadComplete?: (document: Document) => void;
}>) {
  const [entries, setEntries] = React.useState<UploadEntry[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const uploadFiles = React.useCallback(
    async (files: File[]) => {
      const nextEntries = files.map((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        status: 'queued' as const,
        file,
      }));

      setEntries((current) => [
        ...current,
        ...nextEntries.map(({ file: _file, ...entry }) => entry),
      ]);

      const workers = Array.from({ length: Math.min(5, nextEntries.length) });
      let cursor = 0;

      await Promise.all(
        workers.map(async () => {
          while (cursor < nextEntries.length) {
            const currentIndex = cursor;
            cursor += 1;
            const entry = nextEntries[currentIndex];
            if (!entry) continue;

            await uploadSingleFile(entry.id, entry.file, claimId, (update) => {
              setEntries((current) =>
                current.map((item) =>
                  item.id === entry.id ? { ...item, ...update } : item,
                ),
              );
            }).then((document) => {
              if (document) {
                onUploadComplete?.(document);
              }
            });
          }
        }),
      );
    },
    [claimId, onUploadComplete],
  );

  function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) {
      void uploadFiles(files);
    }
  }

  return (
    <div className="space-y-3" data-testid="document-uploader">
      <div
        role="button"
        tabIndex={0}
        aria-label="אזור העלאת מסמכים תומכים"
        data-state={isDragOver ? 'drag-over' : 'idle'}
        className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background p-4 text-center transition-colors data-[state=drag-over]:border-primary data-[state=drag-over]:bg-primary/5"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <FileUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">גרור לכאן מסמכים או בחר קבצים</p>
          <p className="text-sm text-muted-foreground">
            PDF, JPEG, PNG, HEIC עד 4 MB לקובץ
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm">
          בחירת קבצים
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={DOCUMENT_UPLOAD_ACCEPT}
          multiple
          onChange={(event) => {
            handleFiles(event.target.files);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {entries.length > 0 ? (
        <ul className="space-y-2" aria-label="קבצים שהועלו">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 rounded-md border bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="truncate" title={entry.fileName}>
                {entry.fileName}
              </span>
              <span className="text-muted-foreground">
                {entry.status === 'error'
                  ? `${STATUS_LABELS.error}: ${entry.error}`
                  : STATUS_LABELS[entry.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function uploadSingleFile(
  id: string,
  file: File,
  claimId: string,
  update: (entry: Partial<UploadEntry>) => void,
): Promise<Document | null> {
  let uploadFile = file;

  if (isHeicFile(file)) {
    update({ status: 'converting' });
    try {
      uploadFile = await convertHeicToJpeg(file);
      update({ fileName: uploadFile.name });
    } catch {
      update({ status: 'error', error: 'המרת התמונה נכשלה' });
      return null;
    }
  }

  const clientError = getClientValidationError(uploadFile);

  if (clientError) {
    update({ status: 'error', error: clientError });
    return null;
  }

  update({ status: 'uploading' });

  try {
    const formData = new FormData();
    formData.append('file', uploadFile);

    const response = await fetch(`/api/claims/${claimId}/documents`, {
      method: 'POST',
      body: formData,
    });
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { document?: Document };
      error?: { code?: string };
    };

    if (response.ok && json.ok && json.data?.document) {
      update({ status: 'processing' });
      await pollDocumentStatus(claimId, json.data.document.id, update);
      return json.data.document;
    }

    update({
      status: 'error',
      error: mapUploadError(json.error?.code ?? 'network_error'),
    });
  } catch {
    update({ status: 'error', error: mapUploadError('network_error') });
  }

  return null;
}

function getClientValidationError(file: File): string | null {
  if (file.size <= 100) {
    return mapUploadError('empty_file');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return mapUploadError('file_too_large');
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return mapUploadError('invalid_file_type');
  }

  return null;
}

function mapUploadError(code: string): string {
  switch (code) {
    case 'file_too_large':
      return 'הקובץ גדול מ-4 MB';
    case 'invalid_file_type':
      return 'סוג קובץ לא נתמך';
    case 'empty_file':
      return 'קובץ ריק';
    case 'document_limit_reached':
      return 'הגעת למגבלה של 50 מסמכים לתיק';
    case 'claim_not_found':
      return 'התיק לא נמצא';
    case 'claim_not_acceptable':
      return 'התיק לא מקבל מסמכים נוספים בשלב זה';
    case 'storage_error':
      return 'שגיאת אחסון. נסה שוב.';
    case 'upload_partial_failure':
      return 'ההעלאה נכשלה. נסה שוב.';
    case 'document_not_found':
      return 'המסמך לא נמצא';
    case 'processing_failed':
      return 'עיבוד המסמך נכשל';
    default:
      return 'שגיאת רשת. נסה שוב.';
  }
}

type DocumentStatusResponse = {
  documentId: string;
  processing_status: DocumentProcessingStatus;
  document_type: DocumentType;
  error_message?: string;
};

async function pollDocumentStatus(
  claimId: string,
  documentId: string,
  update: (entry: Partial<UploadEntry>) => void,
) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5_000);
    let response: Response;
    try {
      response = await fetch(
        `/api/claims/${claimId}/documents/${documentId}/status`,
        { cache: 'no-store', signal: controller.signal },
      );
    } catch {
      window.clearTimeout(timeout);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      continue;
    }
    window.clearTimeout(timeout);

    const json = (await response.json()) as {
      ok?: boolean;
      data?: DocumentStatusResponse;
      error?: { code?: string };
    };

    if (!response.ok || !json.ok || !json.data) {
      update({
        status: 'error',
        error: mapUploadError(json.error?.code ?? 'network_error'),
      });
      return;
    }

    if (json.data.processing_status === 'processed') {
      update({ status: 'success' });
      return;
    }

    if (json.data.processing_status === 'failed') {
      update({
        status: 'error',
        error: json.data.error_message ?? mapUploadError('processing_failed'),
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  update({ status: 'processing' });
}
