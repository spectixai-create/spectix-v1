import type { MockUploadedFile } from '@/components/intake/types';
import { Dropzone } from '@/components/intake/dropzone';
import { UploadedFileRow } from '@/components/intake/uploaded-file-row';
import { SectionDivider } from '@/components/layout/section-divider';
import { EmptyState } from '@/components/states/empty-state';

export function SectionDocuments({
  files,
  onAdd,
  onRemove,
}: Readonly<{
  files: MockUploadedFile[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}>) {
  return (
    <section className="space-y-4" aria-label="העלאת מסמכים">
      <div className="space-y-2">
        <SectionDivider title="העלאת מסמכים" />
        <p className="text-sm leading-6 text-muted-foreground">
          ניתן להעלות עד 20 קבצים. PDF, JPG, PNG, WEBP. עד 32MB לקובץ.
        </p>
      </div>
      <Dropzone onAdd={onAdd} />
      {files.length > 0 ? (
        <div className="space-y-2" aria-label="קבצים שהועלו">
          {files.map((file) => (
            <UploadedFileRow key={file.id} file={file} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="אין קבצים שהועלו"
          description="מסמכים שתצרף לתיק יופיעו כאן לפני השליחה."
          className="min-h-40"
        />
      )}
    </section>
  );
}
