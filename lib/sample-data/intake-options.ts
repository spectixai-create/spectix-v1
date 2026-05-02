// Refactor to import enums from @/lib/types when Spike #00a lands.
export type IntakeOption = {
  value: string;
  label: string;
};

export const claimTypeOptions: IntakeOption[] = [
  { value: 'theft', label: 'גניבה' },
  { value: 'medical', label: 'רפואי' },
  { value: 'flight', label: 'טיסה' },
  { value: 'liability', label: 'חבות' },
  { value: 'emergency', label: 'חירום' },
  { value: 'other', label: 'אחר' },
];

export const tripPurposeOptions: IntakeOption[] = [
  { value: 'tourism', label: 'תיירות' },
  { value: 'business', label: 'עסקים' },
  { value: 'family', label: 'ביקור משפחה' },
  { value: 'medical', label: 'רפואי' },
  { value: 'study', label: 'לימודים' },
  { value: 'other', label: 'אחר' },
];

export const countryOptions: IntakeOption[] = [
  { value: 'TH', label: 'תאילנד' },
  { value: 'US', label: 'ארצות הברית' },
  { value: 'IT', label: 'איטליה' },
  { value: 'FR', label: 'צרפת' },
  { value: 'GR', label: 'יוון' },
  { value: 'ES', label: 'ספרד' },
  { value: 'DE', label: 'גרמניה' },
  { value: 'GB', label: 'בריטניה' },
  { value: 'PT', label: 'פורטוגל' },
  { value: 'NL', label: 'הולנד' },
  { value: 'AT', label: 'אוסטריה' },
  { value: 'CH', label: 'שוויץ' },
  { value: 'JP', label: 'יפן' },
  { value: 'IN', label: 'הודו' },
  { value: 'VN', label: 'וייטנאם' },
  { value: 'GE', label: 'גאורגיה' },
  { value: 'AE', label: 'איחוד האמירויות' },
  { value: 'TR', label: 'טורקיה' },
  { value: 'CY', label: 'קפריסין' },
  { value: 'CZ', label: 'צכיה' },
  { value: 'HU', label: 'הונגריה' },
  { value: 'PL', label: 'פולין' },
  { value: 'RO', label: 'רומניה' },
  { value: 'CA', label: 'קנדה' },
  { value: 'MX', label: 'מקסיקו' },
  { value: 'BR', label: 'ברזיל' },
  { value: 'AR', label: 'ארגנטינה' },
  { value: 'AU', label: 'אוסטרליה' },
  { value: 'NZ', label: 'ניו זילנד' },
  { value: 'ZA', label: 'דרום אפריקה' },
  { value: 'other', label: 'אחר' },
];
