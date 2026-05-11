import type { ClaimMetadata } from '@/lib/types';

export const theftBagLocationOptions = [
  { value: 'on_body', label: 'על הגוף' },
  { value: 'near_customer', label: 'ליד המבוטח' },
  { value: 'hotel_room', label: 'בחדר מלון' },
  { value: 'locked_vehicle', label: 'ברכב נעול' },
  { value: 'unlocked_vehicle', label: 'ברכב לא נעול' },
  { value: 'public_transport', label: 'בתחבורה ציבורית' },
  { value: 'restaurant', label: 'במסעדה / בית קפה' },
  { value: 'unknown', label: 'לא ידוע' },
  { value: 'other', label: 'אחר' },
] as const;

export const yesNoUnknownOptions = [
  { value: 'yes', label: 'כן' },
  { value: 'no', label: 'לא' },
  { value: 'unknown', label: 'לא ידוע' },
] as const;

export const stolenItemCategoryOptions = [
  { value: 'bag', label: 'תיק / מזוודה' },
  { value: 'clothing', label: 'ביגוד' },
  { value: 'electronics', label: 'אלקטרוניקה' },
  { value: 'jewelry', label: 'תכשיט' },
  { value: 'cash', label: 'מזומן' },
  { value: 'documents', label: 'מסמכים' },
  { value: 'other', label: 'אחר' },
] as const;

export const stolenItemCurrencyOptions = [
  'ILS',
  'USD',
  'EUR',
  'GBP',
  'OTHER',
] as const;

export type TheftBagLocation =
  (typeof theftBagLocationOptions)[number]['value'];
export type YesNoUnknown = (typeof yesNoUnknownOptions)[number]['value'];
export type StolenItemCategory =
  (typeof stolenItemCategoryOptions)[number]['value'];
export type StolenItemCurrency = (typeof stolenItemCurrencyOptions)[number];

export type TheftDetails = {
  bag_location_at_theft: TheftBagLocation | null;
  was_bag_supervised: YesNoUnknown | null;
  was_forced_entry: YesNoUnknown | null;
  police_report_filed: YesNoUnknown | null;
  police_report_available: YesNoUnknown | null;
  stolen_valuables: YesNoUnknown | null;
  stolen_electronics: YesNoUnknown | null;
  stolen_cash: YesNoUnknown | null;
  compensation_from_other_source: YesNoUnknown | null;
  theft_description: string | null;
};

export type StolenItem = {
  name: string | null;
  category: StolenItemCategory | null;
  claimed_amount: number | null;
  currency: StolenItemCurrency | null;
  purchase_year: number | null;
  has_receipt: YesNoUnknown | null;
  has_proof_of_ownership: YesNoUnknown | null;
  is_valuable: YesNoUnknown | null;
  notes: string | null;
};

export type TheftMetadata = {
  theft_details?: TheftDetails | null;
  stolen_items?: StolenItem[] | null;
};

export function getOptionLabel<TValue extends string>(
  options: readonly { value: TValue; label: string }[],
  value: TValue | string | null | undefined,
): string {
  if (!value) return 'לא צוין';
  return options.find((option) => option.value === value)?.label ?? value;
}

export function readTheftMetadata(
  metadata: ClaimMetadata | Record<string, unknown> | null | undefined,
): Required<TheftMetadata> {
  if (!isRecord(metadata)) {
    return { theft_details: null, stolen_items: [] };
  }

  return {
    theft_details: readTheftDetails(metadata.theft_details),
    stolen_items: readStolenItems(metadata.stolen_items),
  };
}

function readTheftDetails(value: unknown): TheftDetails | null {
  if (!isRecord(value)) return null;

  return {
    bag_location_at_theft: readBagLocation(value.bag_location_at_theft),
    was_bag_supervised: readYesNoUnknown(value.was_bag_supervised),
    was_forced_entry: readYesNoUnknown(value.was_forced_entry),
    police_report_filed: readYesNoUnknown(value.police_report_filed),
    police_report_available: readYesNoUnknown(value.police_report_available),
    stolen_valuables: readYesNoUnknown(value.stolen_valuables),
    stolen_electronics: readYesNoUnknown(value.stolen_electronics),
    stolen_cash: readYesNoUnknown(value.stolen_cash),
    compensation_from_other_source: readYesNoUnknown(
      value.compensation_from_other_source,
    ),
    theft_description: readOptionalString(value.theft_description),
  };
}

function readStolenItems(value: unknown): StolenItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    return [
      {
        name: readOptionalString(item.name),
        category: readStolenItemCategory(item.category),
        claimed_amount: readOptionalNumber(item.claimed_amount),
        currency: readStolenItemCurrency(item.currency),
        purchase_year: readOptionalInteger(item.purchase_year),
        has_receipt: readYesNoUnknown(item.has_receipt),
        has_proof_of_ownership: readYesNoUnknown(item.has_proof_of_ownership),
        is_valuable: readYesNoUnknown(item.is_valuable),
        notes: readOptionalString(item.notes),
      },
    ];
  });
}

function readBagLocation(value: unknown): TheftBagLocation | null {
  return theftBagLocationOptions.some((option) => option.value === value)
    ? (value as TheftBagLocation)
    : null;
}

function readYesNoUnknown(value: unknown): YesNoUnknown | null {
  return value === 'yes' || value === 'no' || value === 'unknown'
    ? value
    : null;
}

function readStolenItemCategory(value: unknown): StolenItemCategory | null {
  return stolenItemCategoryOptions.some((option) => option.value === value)
    ? (value as StolenItemCategory)
    : null;
}

function readStolenItemCurrency(value: unknown): StolenItemCurrency | null {
  return stolenItemCurrencyOptions.includes(value as StolenItemCurrency)
    ? (value as StolenItemCurrency)
    : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function readOptionalInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
