'use client';

import { toast } from 'sonner';

import { Spinner } from '@/components/states/loading';
import { Button } from '@/components/ui/button';

export function FormActions({
  submitting,
  canSubmit = true,
}: Readonly<{
  submitting: boolean;
  canSubmit?: boolean;
}>) {
  return (
    <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row-reverse sm:justify-start">
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={submitting || !canSubmit}
      >
        {submitting ? <Spinner label="שולח..." /> : 'שלח לבדיקה'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={submitting}
        onClick={() => toast.success('הטיוטה נשמרה')}
      >
        שמור כטיוטה
      </Button>
    </div>
  );
}
