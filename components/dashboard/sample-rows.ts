import type { RiskBand } from '@/components/risk/risk-band';

// Local type - refactor to import from @/lib/types when Spike #00a lands.
export type SampleClaimRow = {
  id: string;
  claimantName: string;
  country: string;
  amountIls: number;
  originalAmount: string;
  riskBand: RiskBand;
  passStatus: string;
  status: 'פתוח' | 'בעיבוד' | 'ממתין לתשובה' | 'סיים';
  date: string;
  claimType: string;
};

export const sampleClaimRows: SampleClaimRow[] = [
  {
    id: '2024-001',
    claimantName: 'נועה בן דוד',
    country: 'תאילנד',
    amountIls: 4620,
    originalAmount: 'USD 1,234.56',
    riskBand: 'red',
    passStatus: 'Pass 2/3',
    status: 'ממתין לתשובה',
    date: '2024-01-15',
    claimType: 'גניבת כבודה',
  },
  {
    id: '2024-002',
    claimantName: 'אורי לוי',
    country: 'איטליה',
    amountIls: 1180,
    originalAmount: 'EUR 290',
    riskBand: 'green',
    passStatus: 'סיים',
    status: 'סיים',
    date: '2024-01-14',
    claimType: 'עיכוב טיסה',
  },
  {
    id: '2024-003',
    claimantName: 'דנה כהן',
    country: 'יפן',
    amountIls: 8200,
    originalAmount: 'JPY 341,000',
    riskBand: 'orange',
    passStatus: 'Pass 1/3 (בעיבוד)',
    status: 'בעיבוד',
    date: '2024-01-13',
    claimType: 'ציוד צילום',
  },
  {
    id: '2024-004',
    claimantName: 'מיכאל רוזן',
    country: 'גרמניה',
    amountIls: 950,
    originalAmount: 'EUR 235',
    riskBand: 'yellow',
    passStatus: 'Pass 2/3',
    status: 'פתוח',
    date: '2024-01-12',
    claimType: 'הוצאות רפואיות',
  },
  {
    id: '2024-005',
    claimantName: 'יעל אברהמי',
    country: 'ספרד',
    amountIls: 2470,
    originalAmount: 'EUR 610',
    riskBand: 'yellow',
    passStatus: 'ממתין לתשובה',
    status: 'ממתין לתשובה',
    date: '2024-01-11',
    claimType: 'כבודה מאוחרת',
  },
  {
    id: '2024-006',
    claimantName: 'רועי פרידמן',
    country: 'ארצות הברית',
    amountIls: 15300,
    originalAmount: 'USD 4,080',
    riskBand: 'red',
    passStatus: 'Pass 2/3',
    status: 'פתוח',
    date: '2024-01-10',
    claimType: 'ביטול נסיעה',
  },
  {
    id: '2024-007',
    claimantName: 'ליאת שמיר',
    country: 'צרפת',
    amountIls: 730,
    originalAmount: 'EUR 180',
    riskBand: 'green',
    passStatus: 'סיים',
    status: 'סיים',
    date: '2024-01-09',
    claimType: 'אובדן מסמך',
  },
  {
    id: '2024-008',
    claimantName: 'עמית ברק',
    country: 'פורטוגל',
    amountIls: 3890,
    originalAmount: 'EUR 960',
    riskBand: 'yellow',
    passStatus: 'Pass 1/3 (בעיבוד)',
    status: 'בעיבוד',
    date: '2024-01-08',
    claimType: 'הוצאות מלון',
  },
  {
    id: '2024-009',
    claimantName: 'שרה מלכה כהן ארוך מאוד',
    country: 'יוון',
    amountIls: 5120,
    originalAmount: 'EUR 1,260',
    riskBand: 'orange',
    passStatus: 'ממתין לתשובה',
    status: 'ממתין לתשובה',
    date: '2024-01-07',
    claimType: 'גניבת טלפון',
  },
  {
    id: '2024-010',
    claimantName: 'גיל סלע',
    country: 'קנדה',
    amountIls: 1640,
    originalAmount: 'CAD 610',
    riskBand: 'yellow',
    passStatus: 'Pass 2/3',
    status: 'פתוח',
    date: '2024-01-06',
    claimType: 'ביקור רופא',
  },
];

export const mockStats = {
  open: 128,
  pending: 37,
  red: 2,
  processing: 2,
};
