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
  { value: 'ILS', label: 'ILS' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'JPY', label: 'JPY' },
  { value: 'THB', label: 'THB' },
  { value: 'AUD', label: 'AUD' },
  { value: 'CAD', label: 'CAD' },
  { value: 'CHF', label: 'CHF' },
  { value: 'TRY', label: 'TRY' },
  { value: 'EGP', label: 'EGP' },
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
