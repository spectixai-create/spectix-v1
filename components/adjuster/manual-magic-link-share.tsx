'use client';

import { useId, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';

import { copyTextWithClipboard, type CopyTextResult } from '@/lib/ui/clipboard';
import { Button } from '@/components/ui/button';

const MANUAL_COPY_HELP = 'אם ההעתקה לא עובדת, סמנו את הקישור והעתיקו ידנית';

export function ManualMagicLinkShare({
  magicLinkUrl,
  copyButtonLabel = 'העתקה',
}: Readonly<{
  magicLinkUrl: string;
  copyButtonLabel?: string;
}>) {
  const linkId = useId();
  const helpId = `${linkId}-help`;
  const statusId = `${linkId}-status`;
  const [copyResult, setCopyResult] = useState<CopyTextResult | null>(null);

  async function copyMagicLink() {
    setCopyResult(await copyTextWithClipboard(magicLinkUrl));
  }

  function selectLink(
    event:
      | React.FocusEvent<HTMLInputElement>
      | React.MouseEvent<HTMLInputElement>,
  ) {
    event.currentTarget.select();
  }

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <label
        htmlFor={linkId}
        className="mb-2 flex items-center gap-2 text-sm font-medium"
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        קישור למבוטח
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={linkId}
          readOnly
          aria-describedby={`${helpId} ${statusId}`}
          aria-label="קישור לשיתוף ידני עם המבוטח"
          className="ltr-isolate min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          value={magicLinkUrl}
          onFocus={selectLink}
          onClick={selectLink}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={copyMagicLink}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copyButtonLabel}
        </Button>
      </div>
      <p id={helpId} className="mt-2 text-xs text-muted-foreground">
        {MANUAL_COPY_HELP}
      </p>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={
          copyResult === 'manual'
            ? 'mt-1 text-xs text-amber-700'
            : 'mt-1 text-xs text-muted-foreground'
        }
      >
        {copyResult === 'copied'
          ? 'הקישור הועתק'
          : copyResult === 'manual'
            ? 'לא ניתן להעתיק אוטומטית. סמנו את הקישור והעתיקו ידנית.'
            : ''}
      </p>
    </div>
  );
}
