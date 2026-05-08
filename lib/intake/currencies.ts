export type CurrencyCode =
  | 'ILS'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'THB'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'TRY'
  | 'EGP';

export const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: 'ILS', label: '₪ ILS — שקל' },
  { value: 'USD', label: '$ USD — דולר אמריקאי' },
  { value: 'EUR', label: '€ EUR — יורו' },
  { value: 'GBP', label: '£ GBP — לירה שטרלינג' },
  { value: 'JPY', label: '¥ JPY — יין יפני' },
  { value: 'THB', label: '฿ THB — באט תאילנדי' },
  { value: 'AUD', label: 'A$ AUD — דולר אוסטרלי' },
  { value: 'CAD', label: 'C$ CAD — דולר קנדי' },
  { value: 'CHF', label: 'CHF — פרנק שוויצרי' },
  { value: 'TRY', label: '₺ TRY — לירה טורקית' },
  { value: 'EGP', label: 'E£ EGP — לירה מצרית' },
];

export const countryCurrencyHints: Record<string, CurrencyCode> = {
  TH: 'THB',
  US: 'USD',
  IT: 'EUR',
  FR: 'EUR',
  GR: 'EUR',
  ES: 'EUR',
  DE: 'EUR',
  GB: 'GBP',
  PT: 'EUR',
  NL: 'EUR',
  AT: 'EUR',
  CH: 'CHF',
  JP: 'JPY',
  AU: 'AUD',
  CA: 'CAD',
  TR: 'TRY',
  EG: 'EGP',
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}
