'use client';

import type { Control } from 'react-hook-form';

import { FieldLabel } from '@/components/intake/field-label';
import type { IntakeFormValues } from '@/components/intake/types';
import { DraftLegalContent } from '@/components/legal/draft-legal-content';
import { SectionDivider } from '@/components/layout/section-divider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

export function SectionConsent({
  control,
}: Readonly<{
  control: Control<IntakeFormValues>;
}>) {
  return (
    <section className="space-y-4" aria-label="אישורים">
      <SectionDivider title="אישורים" />
      <FormField
        control={control}
        name="tosAccepted"
        rules={{
          validate: (value) =>
            value === true ||
            'יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני שליחה',
        }}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-start gap-3 rounded-md border bg-card p-4">
              <FormControl>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-primary"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  aria-label="קראתי ואני מסכים לתנאי השימוש ולמדיניות הפרטיות"
                />
              </FormControl>
              <div className="space-y-2">
                <FieldLabel>
                  קראתי ואני מסכים לתנאי השימוש ולמדיניות הפרטיות
                </FieldLabel>
                <div className="flex flex-wrap gap-2 text-sm">
                  <LegalDialog kind="terms" label="תנאי השימוש" />
                  <LegalDialog kind="privacy" label="מדיניות הפרטיות" />
                </div>
                <FormMessage />
              </div>
            </div>
          </FormItem>
        )}
      />
    </section>
  );
}

function LegalDialog({
  kind,
  label,
}: Readonly<{
  kind: 'terms' | 'privacy';
  label: string;
}>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="h-auto p-0">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <DraftLegalContent kind={kind} />
      </DialogContent>
    </Dialog>
  );
}
