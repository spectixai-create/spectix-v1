import { FileImage, FileText, X } from 'lucide-react';

import type { MockUploadedFile } from '@/components/intake/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function UploadedFileRow({
  file,
  onRemove,
}: Readonly<{
  file: MockUploadedFile;
  onRemove: (id: string) => void;
}>) {
  const Icon = file.type.startsWith('image/') ? FileImage : FileText;

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium" title={file.name}>
            {file.name}
          </p>
          <p className="num font-latin text-xs text-muted-foreground">
            {formatFileSize(file.sizeBytes)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0 self-end sm:self-auto')}
        aria-label={`הסרת קובץ ${file.name}`}
        onClick={() => onRemove(file.id)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
