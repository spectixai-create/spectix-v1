import type { Control, UseFormWatch } from 'react-hook-form';

import { FieldLabel } from '@/components/intake/field-label';
import type { IntakeFormValues } from '@/components/intake/types';
import { SectionDivider } from '@/components/layout/section-divider';
import { tripPurposeOptions } from '@/lib/sample-data/intake-options';
import {
  TRIP_DATE_MESSAGES,
  todayInIsrael,
} from '@/lib/intake/trip-validation';
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
  watch,
}: Readonly<{
  control: Control<IntakeFormValues>;
  watch: UseFormWatch<IntakeFormValues>;
}>) {
  const tripStartDate = watch('tripStartDate');
  const claimType = watch('claimType');
  const preTripInsurance = watch('preTripInsurance');

  return (
    <section className="space-y-4" aria-label="פרטי הנסיעה">
      <div className="space-y-2">
        <SectionDivider title="פרטי הנסיעה" />
        <p className="text-sm leading-6 text-muted-foreground">
          מידע זה עוזר לנו להעריך את התיק במהירות וללא שאלות מיותרות
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="tripStartDate"
          rules={{
            required: 'שדה חובה',
            validate: (value) =>
              value <= todayInIsrael() || TRIP_DATE_MESSAGES.futureTripStart,
          }}
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>תאריך עזיבה</FieldLabel>
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
          name="tripEndDate"
          rules={{
            required: 'שדה חובה',
            validate: (value) =>
              !tripStartDate ||
              value >= tripStartDate ||
              TRIP_DATE_MESSAGES.tripEndBeforeStart,
          }}
          render={({ field }) => (
            <FormItem>
              <FieldLabel required>תאריך חזרה</FieldLabel>
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
          name="preTripInsurance"
          rules={{ required: 'שדה חובה' }}
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel required>מועד רכישת הביטוח</FieldLabel>
              <FormControl>
                <div
                  className="grid gap-2 rounded-md border bg-card p-3"
                  role="radiogroup"
                  aria-label="מועד רכישת הביטוח"
                >
                  {[
                    { value: 'yes', label: 'כן, לפני יציאה לחו״ל' },
                    {
                      value: 'no',
                      label: 'לא, נרכש בחו״ל / אחרי יציאה',
                    },
                    { value: 'unknown', label: 'לא בטוח' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={() => field.onChange(option.value)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        className="accent-primary"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </FormControl>
              {preTripInsurance === 'no' && claimType ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  ביטוח שנרכש לאחר תחילת הנסיעה כפוף לתקופת המתנה בפוליסה. ייתכן
                  שהאירוע יידרש בחינה נוספת להתאמה.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
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
