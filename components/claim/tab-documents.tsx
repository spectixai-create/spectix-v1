import { Eye } from 'lucide-react';

import { EmptyState } from '@/components/states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SampleDocument } from '@/lib/sample-data/sample-claim';

const statusMeta: Record<
  SampleDocument['status'],
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  processed: { label: 'עובד', variant: 'risk-green' },
  processing: { label: 'בעיבוד', variant: 'risk-yellow' },
  failed: { label: 'נכשל', variant: 'destructive' },
};

export function TabDocuments({
  documents,
  empty,
}: Readonly<{
  documents: SampleDocument[];
  empty: boolean;
}>) {
  if (empty) {
    return <EmptyState preset="documents" />;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>שם הקובץ</TableHead>
            <TableHead>סוג</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead>תאריך עיבוד</TableHead>
            <TableHead>פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="font-latin">{document.fileName}</TableCell>
              <TableCell>{document.type}</TableCell>
              <TableCell>
                <Badge variant={statusMeta[document.status].variant}>
                  {statusMeta[document.status].label}
                </Badge>
              </TableCell>
              <TableCell className="num font-latin">
                {formatDateTime(document.processedAt)}
              </TableCell>
              <TableCell>
                <Button asChild variant="ghost" size="icon">
                  <a href="#" aria-label={`צפייה במסמך ${document.fileName}`}>
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="space-y-3">
        {documents.map((document) => (
          <details
            key={`${document.id}-details`}
            className="rounded-md border bg-card p-4"
          >
            <summary className="cursor-pointer font-medium">
              נתונים שחולצו - {document.fileName}
            </summary>
            <pre className="ltr-isolate mt-3 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(document.extractedData, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}
