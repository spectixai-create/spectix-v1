import type { Control } from 'react-hook-form';

import { FieldLabel } from '@/components/intake/field-label';
import type { IntakeFormValues } from '@/components/intake/types';
import { SectionDivider } from '@/components/layout/section-divider';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function SectionClaimant({
  control,
}: Readonly<{
  control: Control<IntakeFormValues>;
}>) {
  return (
    <section className="space-y-4" aria-label="פרטי המבוטח">
      <SectionDivider title="פרטי המבוטח" />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>שם מלא</FieldLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>אימייל</FieldLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>טלפון</FieldLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="policyNumber"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>מספר פוליסה</FieldLabel>
              <FormControl>
                <Input
                  className="font-latin"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="occupation"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel required>עיסוק</FieldLabel>
              <FormControl>
                <Input suppressHydrationWarning {...field} />
              </FormControl>
              <FormDescription>נדרש לצורך הערכת הקשר התיק</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}
