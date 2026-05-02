import type { Control, UseFormWatch } from 'react-hook-form';

import { FieldLabel } from '@/components/intake/field-label';
import type { IntakeFormValues } from '@/components/intake/types';
import { SectionDivider } from '@/components/layout/section-divider';
import {
  claimTypeOptions,
  countryOptions,
} from '@/lib/sample-data/intake-options';
import {
  FormControl,
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

export function SectionIncident({
  control,
  watch,
}: Readonly<{
  control: Control<IntakeFormValues>;
  watch: UseFormWatch<IntakeFormValues>;
}>) {
  const description = watch('incidentDescription') ?? '';
  const country = watch('country');

  return (
    <section className="space-y-4" aria-label="פרטי האירוע">
      <SectionDivider title="פרטי האירוע" />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="claimType"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>סוג התביעה</FieldLabel>
              <Select
                dir="rtl"
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג תביעה" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {claimTypeOptions.map((option) => (
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
          name="incidentDate"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>תאריך האירוע</FieldLabel>
              <FormControl>
                <Input
                  type="date"
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
          name="country"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>מדינה</FieldLabel>
              <Select
                dir="rtl"
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מדינה" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {countryOptions.map((option) => (
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
          name="city"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>עיר</FieldLabel>
              <FormControl>
                <Input suppressHydrationWarning {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="amountClaimed"
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>סכום התביעה</FieldLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={10000000}
                  step={1}
                  inputMode="decimal"
                  className="font-latin"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {country === 'other' ? (
          <FormField
            control={control}
            name="otherCountry"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FieldLabel>שם המדינה</FieldLabel>
                <FormControl>
                  <Input
                    placeholder="כתוב את שם המדינה"
                    suppressHydrationWarning
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={control}
          name="incidentDescription"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel required>תיאור האירוע</FieldLabel>
              <FormControl>
                <Textarea
                  minLength={10}
                  maxLength={2000}
                  className="min-h-[120px]"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <div className="flex justify-end text-xs text-muted-foreground">
                <span className="num font-latin">
                  {description.length} / 2000
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}
