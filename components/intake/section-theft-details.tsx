'use client';

import { useFieldArray } from 'react-hook-form';
import type { Control, UseFormWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

import { FieldLabel } from '@/components/intake/field-label';
import {
  createDefaultStolenItem,
  type IntakeFormValues,
} from '@/components/intake/types';
import { SectionDivider } from '@/components/layout/section-divider';
import {
  stolenItemCategoryOptions,
  stolenItemCurrencyOptions,
  theftBagLocationOptions,
  yesNoUnknownOptions,
} from '@/lib/theft/metadata';
import { Button } from '@/components/ui/button';
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

export function SectionTheftDetails({
  control,
  watch,
}: Readonly<{
  control: Control<IntakeFormValues>;
  watch: UseFormWatch<IntakeFormValues>;
}>) {
  const claimType = watch('claimType');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stolenItems',
  });

  if (claimType !== 'theft') return null;

  return (
    <section className="space-y-6" aria-label="פרטי הגניבה">
      <div className="space-y-2">
        <SectionDivider title="פרטי הגניבה" />
        <p className="text-sm leading-6 text-muted-foreground">
          פרטים אלה עוזרים להכין את התיק לבדיקת מומחה ולזהות חוסר מידע או חריגים
          שדורשים עיון.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          control={control}
          name="theftDetails.bagLocationAtTheft"
          label="היכן היה התיק בזמן הגניבה?"
          options={theftBagLocationOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.wasBagSupervised"
          label="האם התיק היה תחת השגחה?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.wasForcedEntry"
          label="האם הייתה פריצה או סימני פריצה?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.policeReportFiled"
          label="האם הוגשה תלונה במשטרה מקומית?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.policeReportAvailable"
          label="האם יש בידך אישור משטרה?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.stolenValuables"
          label="האם נגנבו חפצי ערך?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.stolenElectronics"
          label="האם נגנבו מכשירים אלקטרוניים?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.stolenCash"
          label="האם נגנב מזומן?"
          options={yesNoUnknownOptions}
        />
        <SelectField
          control={control}
          name="theftDetails.compensationFromOtherSource"
          label="האם התקבל או צפוי להתקבל פיצוי מגורם אחר?"
          options={yesNoUnknownOptions}
        />
        <FormField
          control={control}
          name="theftDetails.theftDescription"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel>תיאור נסיבות הגניבה</FieldLabel>
              <FormControl>
                <Textarea
                  maxLength={1000}
                  className="min-h-[100px]"
                  placeholder="תאר בקצרה מה קרה, מי היה ליד התיק ומה נעשה לאחר האירוע."
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionDivider title="פריטים שנגנבו" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(createDefaultStolenItem())}
          >
            <Plus className="ml-1 h-4 w-4" aria-hidden="true" />
            הוסף פריט
          </Button>
        </div>
        {fields.length === 0 ? (
          <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
            עדיין לא נוספו פריטים. ניתן להוסיף פריט אחד או יותר שנגנבו.
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <StolenItemCard
                key={field.id}
                control={control}
                index={index}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SelectField({
  control,
  name,
  label,
  options,
}: Readonly<{
  control: Control<IntakeFormValues>;
  name:
    | 'theftDetails.bagLocationAtTheft'
    | 'theftDetails.wasBagSupervised'
    | 'theftDetails.wasForcedEntry'
    | 'theftDetails.policeReportFiled'
    | 'theftDetails.policeReportAvailable'
    | 'theftDetails.stolenValuables'
    | 'theftDetails.stolenElectronics'
    | 'theftDetails.stolenCash'
    | 'theftDetails.compensationFromOtherSource';
  label: string;
  options: readonly { value: string; label: string }[];
}>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FieldLabel>{label}</FieldLabel>
          <Select dir="rtl" onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="בחר תשובה" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
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
  );
}

function StolenItemCard({
  control,
  index,
  onRemove,
}: Readonly<{
  control: Control<IntakeFormValues>;
  index: number;
  onRemove: () => void;
}>) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">פריט {index + 1}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="ml-1 h-4 w-4" aria-hidden="true" />
          הסר
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name={`stolenItems.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FieldLabel>שם הפריט</FieldLabel>
              <FormControl>
                <Input suppressHydrationWarning {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`stolenItems.${index}.category`}
          render={({ field }) => (
            <FormItem>
              <FieldLabel>קטגוריה</FieldLabel>
              <Select
                dir="rtl"
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stolenItemCategoryOptions.map((option) => (
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
          name={`stolenItems.${index}.claimedAmount`}
          render={({ field }) => (
            <FormItem>
              <FieldLabel>סכום נתבע</FieldLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
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
        <FormField
          control={control}
          name={`stolenItems.${index}.currency`}
          render={({ field }) => (
            <FormItem>
              <FieldLabel>מטבע</FieldLabel>
              <Select
                dir="ltr"
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="ILS" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stolenItemCurrencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
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
          name={`stolenItems.${index}.purchaseYear`}
          render={({ field }) => (
            <FormItem>
              <FieldLabel>שנת רכישה</FieldLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1900}
                  max={2100}
                  className="font-latin"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ItemSelectField
          control={control}
          index={index}
          name="hasReceipt"
          label="יש קבלה?"
        />
        <ItemSelectField
          control={control}
          index={index}
          name="hasProofOfOwnership"
          label="יש הוכחת בעלות?"
        />
        <ItemSelectField
          control={control}
          index={index}
          name="isValuable"
          label="האם זה חפץ ערך?"
        />
        <FormField
          control={control}
          name={`stolenItems.${index}.notes`}
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FieldLabel>הערה</FieldLabel>
              <FormControl>
                <Textarea
                  maxLength={500}
                  className="min-h-[80px]"
                  suppressHydrationWarning
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function ItemSelectField({
  control,
  index,
  name,
  label,
}: Readonly<{
  control: Control<IntakeFormValues>;
  index: number;
  name: 'hasReceipt' | 'hasProofOfOwnership' | 'isValuable';
  label: string;
}>) {
  return (
    <FormField
      control={control}
      name={`stolenItems.${index}.${name}`}
      render={({ field }) => (
        <FormItem>
          <FieldLabel>{label}</FieldLabel>
          <Select dir="rtl" onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="בחר תשובה" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {yesNoUnknownOptions.map((option) => (
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
  );
}
