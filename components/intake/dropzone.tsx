'use client';

import * as React from 'react';
import { UploadCloud } from 'lucide-react';

import { cn } from '@/lib/utils';
import { DOCUMENT_UPLOAD_ACCEPT } from '@/lib/upload/heic';

export function Dropzone({
  onAdd,
}: Readonly<{
  onAdd: (files: File[]) => void;
}>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      setHasError(true);
      return;
    }

    setHasError(false);
    onAdd(files);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="אזור העלאת מסמכים"
      data-state={isDragOver ? 'drag-over' : hasError ? 'error' : 'idle'}
      className={cn(
        'flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-card p-5 text-center transition-colors md:min-h-[200px]',
        isDragOver && 'border-primary bg-accent',
        hasError && 'border-destructive bg-destructive/10',
      )}
      onClick={openFilePicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openFilePicker();
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
        if (event.currentTarget === event.target) {
          setIsDragOver(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept={`${DOCUMENT_UPLOAD_ACCEPT},.webp`}
        suppressHydrationWarning
        onChange={(event) => addFiles(event.target.files)}
      />
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        <UploadCloud className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">
          {isDragOver ? 'שחרר כאן את הקבצים' : 'גרור מסמכים לכאן'}
        </p>
        <p className="text-sm text-muted-foreground">
          או לחץ לבחירת קבצים מהמכשיר
        </p>
      </div>
      {hasError ? (
        <p className="text-sm text-destructive">לא זוהו קבצים תקינים בהעלאה</p>
      ) : null}
    </div>
  );
}
