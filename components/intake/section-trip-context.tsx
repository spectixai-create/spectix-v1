import type { Control } from 'react-hook-form';

import { FieldLabel } from '@/components/intake/field-label';
import type { IntakeFormValues } from '@/components/intake/types';
import { SectionDivider } from '@/components/layout/section-divider';
import { tripPurposeOptions } from '@/lib/sample-data/intake-options';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function SectionTripContext({
  control,
}: Readonly<{
  control: Control<IntakeFormValues>;
}>) {
  return (
    <section className="space-y-4" aria-label="הקשר הנסיעה">
      <div className="space-y-2">
        <SectionDivider title="הקשר הנסיעה" />
        <p className="text-sm leading-6 text-muted-foreground">
          מידע זה עוזר לנו להעריך את התיק במהירות וללא שאלות מיותרות
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="tripPurpose"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel required>מטרת הנסיעה</FieldLabel>
              <Select
                dir="rtl"
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מטרת נסיעה" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tripPurposeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="localConnections"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel>קשרים מקומיים</FieldLabel>
              <FormControl>
                <Textarea
                  placeholder="האם יש לך קשרים מקומיים? משפחה, חברים, עסקים. כתוב 'אין' אם רלוונטי."
                  className="min-h-[100px]"
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
          name="previousTripsCount"
          render={({ field }) => (
            <FormItem>
              <FieldLabel>מספר נסיעות למדינה זו ב-24 חודשים אחרונים</FieldLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={99}
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
          name="previousClaimsCount"
          render={({ field }) => (
            <FormItem>
              <FieldLabel>מתוכן עם תביעות ביטוח</FieldLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  className="font-latin"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormDescription>
                אם הגשת תביעות מנסיעות קודמות למדינה זו
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}
