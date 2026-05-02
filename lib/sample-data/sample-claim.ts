import type { RiskBand } from '@/components/risk/risk-band';

// Local types - refactor to import from @/lib/types when Spike #00a lands.
export type FindingSeverity = 'HIGH' | 'MED' | 'LOW';

export type SampleFinding = {
  id: string;
  pass: number;
  severity: FindingSeverity;
  title: string;
  evidence: string;
};

export type SamplePass = {
  id: string;
  passNumber: number;
  title: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  riskBand: RiskBand;
  findingsCount: number;
  gapsCount: number;
  status: 'completed' | 'skipped';
  skipReason?: string;
  events: {
    type: 'complete' | 'warning' | 'progress';
    text: string;
  }[];
};

export type SampleDocument = {
  id: string;
  fileName: string;
  type: string;
  status: 'processed' | 'processing' | 'failed';
  processedAt: string;
  extractedData: Record<string, string | number | boolean>;
};

export type SampleAuditEntry = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
};

export type SampleClaim = {
  id: string;
  claimantName: string;
  tripCountry: string;
  tripPurpose: string;
  claimType: string;
  amountIls: number;
  originalAmount: string;
  coverageStatus: 'passed' | 'failed';
  underwritingViolations: number;
  tripContext: {
    purpose: string;
    localConnections: string;
    previousTrips: string;
    occupation: string;
    occupationRelevance: string;
    connectionFactor: string;
  };
  claimantReadiness: {
    score: number;
    interpretation: string;
  };
  summary: string;
  riskBand: RiskBand;
  riskReason: string;
  findings: SampleFinding[];
  requiredActions: string[];
  clarificationQuestions: string[];
  finalRecommendation: {
    status: string;
    text: string;
  };
  passes: SamplePass[];
  documents: SampleDocument[];
  auditEntries: SampleAuditEntry[];
};

export const sampleClaim: SampleClaim = {
  id: '2024-001',
  claimantName: 'נועה בן דוד',
  tripCountry: 'תאילנד',
  tripPurpose: 'חופשת תיירות בבנגקוק וצפון תאילנד',
  claimType: 'גניבת כבודה',
  amountIls: 4620,
  originalAmount: 'USD 1,234.56 / THB 44,820',
  coverageStatus: 'passed',
  underwritingViolations: 1,
  tripContext: {
    purpose: 'תיירות פרטית לאחר סיום פרויקט עבודה',
    localConnections: 'אין קשרים מקומיים מוצהרים בתאילנד',
    previousTrips: 'שתי נסיעות קודמות לאירופה, ללא תביעות',
    occupation: 'מנהלת שיווק בחברת תוכנה',
    occupationRelevance: 'רכישת ציוד צילום ואלקטרוניקה אינה חריגה לעיסוק',
    connectionFactor: 'נמוך - אין זיקה עסקית או משפחתית ליעד',
  },
  claimantReadiness: {
    score: 62,
    interpretation:
      'שיתוף הפעולה טוב, אך חסרה תשובה לגבי מקור הקבלה ופרטי החנות.',
  },
  summary:
    'המבוטחת דיווחה על גניבת תיק יד במרכז קניות בבנגקוק. בתיק היו מצלמה, אוזניות ומטען נייד שנרכשו לטענתה בחנות Trendy Electronics. דווח למשטרה המקומית באותו יום והועלה אישור מהמלון. לאחר Pass 2 נמצא כי החנות אינה מופיעה במפות ובמאגרי עסקים מקומיים, ולכן רמת הסיכון עלתה.',
  riskBand: 'red',
  riskReason:
    'החנות שמופיעה בקבלה לא אותרה, ושעת הדיווח למלון אינה תואמת במדויק לדוח המשטרה.',
  findings: [
    {
      id: 'finding-1',
      pass: 1,
      severity: 'MED',
      title: 'פער בשעת האירוע',
      evidence: 'בדוח המשטרה מופיעה שעה 18:40, ובמכתב המלון מופיעה שעה 20:15.',
    },
    {
      id: 'finding-2',
      pass: 2,
      severity: 'HIGH',
      title: 'Trendy Electronics לא אותרה',
      evidence: 'חיפוש במפות, מאגר עסקים מקומי ואתר הקניון לא מצא חנות בשם זה.',
    },
    {
      id: 'finding-3',
      pass: 2,
      severity: 'LOW',
      title: 'שער החליפין סביר',
      evidence: 'המרת THB ל-USD תואמת בקירוב לשערים שפורסמו בתאריך 15/01/2024.',
    },
  ],
  requiredActions: [
    'לבקש צילום נוסף של הקבלה המקורית כולל מספר עוסק וכתובת מלאה.',
    'לבקש פירוט תשלום מכרטיס האשראי עבור הרכישה הנטענת.',
    'להצליב מול המלון את שעת הפנייה הראשונה לדלפק הקבלה.',
    'להעביר את התיק לבדיקה ידנית לפני החלטת תשלום.',
  ],
  clarificationQuestions: [
    'היכן בדיוק נמצאה חנות Trendy Electronics ומה כתובתה בקניון?',
    'האם הרכישה בוצעה בכרטיס אשראי, מזומן או שילוב ביניהם?',
    'מי היה עם המבוטחת בזמן האירוע ומי סייע בהגשת הדוח?',
  ],
  finalRecommendation: {
    status: 'בדיקה ידנית',
    text: 'אין לדחות בשלב זה, אך נדרש אימות מקור הקבלה והצלבת זמני הדיווח לפני אישור תשלום.',
  },
  passes: [
    {
      id: 'pass-1',
      passNumber: 1,
      title: 'קליטה וסיווג ראשוני',
      startedAt: '2024-01-15T09:10:00Z',
      endedAt: '2024-01-15T09:11:14Z',
      durationSeconds: 74,
      riskBand: 'orange',
      findingsCount: 1,
      gapsCount: 2,
      status: 'completed',
      events: [
        { type: 'complete', text: 'מסמכי בסיס נקלטו ושויכו לתיק.' },
        { type: 'warning', text: 'זוהה פער ראשוני בין שעות האירוע.' },
        { type: 'complete', text: 'סכום התביעה הומר לשקלים לפי שער יומי.' },
      ],
    },
    {
      id: 'pass-2',
      passNumber: 2,
      title: 'העשרה חיצונית ובדיקת עקביות',
      startedAt: '2024-01-15T09:17:20Z',
      endedAt: '2024-01-15T09:19:09Z',
      durationSeconds: 109,
      riskBand: 'red',
      findingsCount: 3,
      gapsCount: 3,
      status: 'completed',
      events: [
        { type: 'complete', text: 'בוצעה בדיקת שער THB/USD לתאריך האירוע.' },
        { type: 'warning', text: 'החנות Trendy Electronics לא אותרה.' },
        { type: 'warning', text: 'נדרש אימות נוסף מול חברת האשראי.' },
      ],
    },
    {
      id: 'pass-3',
      passNumber: 3,
      title: 'בדיקת המשך',
      startedAt: '2024-01-15T09:20:00Z',
      endedAt: '2024-01-15T09:20:00Z',
      durationSeconds: 0,
      riskBand: 'red',
      findingsCount: 3,
      gapsCount: 3,
      status: 'skipped',
      skipReason: 'דולג עד לקבלת תשובות הבהרה מהמבוטחת.',
      events: [{ type: 'progress', text: 'ממתין לתשובת מבוטחת.' }],
    },
  ],
  documents: [
    {
      id: 'doc-1',
      fileName: 'receipt-trendy-electronics.pdf',
      type: 'קבלה',
      status: 'processed',
      processedAt: '2024-01-15T09:08:00Z',
      extractedData: {
        store: 'Trendy Electronics',
        amount_thb: 44820,
        date: '2024-01-12',
        has_address: false,
      },
    },
    {
      id: 'doc-2',
      fileName: 'bangkok-police-report.pdf',
      type: 'דוח משטרה',
      status: 'processed',
      processedAt: '2024-01-15T09:09:00Z',
      extractedData: {
        station: 'Lumphini Police Station',
        event_time: '18:40',
        report_language: 'thai',
      },
    },
    {
      id: 'doc-3',
      fileName: 'hotel-letter.jpg',
      type: 'אישור מלון',
      status: 'processing',
      processedAt: '2024-01-15T09:12:00Z',
      extractedData: {
        hotel: 'Siam Riverside Hotel',
        desk_time: '20:15',
      },
    },
    {
      id: 'doc-4',
      fileName: 'bag-photo.png',
      type: 'תמונה',
      status: 'failed',
      processedAt: '2024-01-15T09:13:00Z',
      extractedData: {
        reason: 'קובץ מטושטש, נדרש צילום חוזר',
      },
    },
  ],
  auditEntries: [
    {
      id: 'audit-1',
      timestamp: '2024-01-15T09:01:00Z',
      actor: 'נועה בן דוד',
      action: 'פתחה תיק חדש והזינה פרטי נסיעה.',
    },
    {
      id: 'audit-2',
      timestamp: '2024-01-15T09:03:00Z',
      actor: 'מערכת',
      action: 'נוצר מזהה תיק 2024-001.',
    },
    {
      id: 'audit-3',
      timestamp: '2024-01-15T09:05:00Z',
      actor: 'נועה בן דוד',
      action: 'העלתה קבלה מחנות Trendy Electronics.',
    },
    {
      id: 'audit-4',
      timestamp: '2024-01-15T09:06:00Z',
      actor: 'נועה בן דוד',
      action: 'העלתה דוח משטרה מתאילנד.',
    },
    {
      id: 'audit-5',
      timestamp: '2024-01-15T09:07:00Z',
      actor: 'נועה בן דוד',
      action: 'העלתה מכתב אישור מהמלון.',
    },
    {
      id: 'audit-6',
      timestamp: '2024-01-15T09:08:00Z',
      actor: 'OCR',
      action: 'עיבד קבלה וחילץ סכום THB 44,820.',
    },
    {
      id: 'audit-7',
      timestamp: '2024-01-15T09:09:00Z',
      actor: 'OCR',
      action: 'עיבד דוח משטרה וחילץ שעת אירוע.',
    },
    {
      id: 'audit-8',
      timestamp: '2024-01-15T09:10:00Z',
      actor: 'Inngest',
      action: 'התחיל Pass 1.',
    },
    {
      id: 'audit-9',
      timestamp: '2024-01-15T09:11:14Z',
      actor: 'Inngest',
      action: 'סיים Pass 1 וסימן סיכון כתום.',
    },
    {
      id: 'audit-10',
      timestamp: '2024-01-15T09:19:09Z',
      actor: 'Spectix',
      action: 'יצר בריף חקירתי ראשוני.',
    },
  ],
};
