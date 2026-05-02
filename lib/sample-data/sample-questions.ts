// Refactor to import from @/lib/types when Spike #00a lands.

export type QuestionStatus = 'pending' | 'answered' | 'closed';
export type QuestionUrgency = 'urgent' | 'normal';

export type SampleQuestion = {
  id: string;
  claimId: string;
  status: QuestionStatus;
  urgency: QuestionUrgency;
  questionText: string;
  sentAt: string;
  answerText?: string;
  answeredAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  context: string;
  attachments?: string[];
  activityLog: {
    at: string;
    actor: string;
    action: string;
    details?: string;
  }[];
};

export const sampleQuestions: SampleQuestion[] = [
  {
    id: 'q-001',
    claimId: '2024-001',
    status: 'pending',
    urgency: 'urgent',
    // urgent because Rule 03 finding (police report) has HIGH severity.
    questionText:
      'אנא העלה דוח משטרה מלא הכולל מספר אירוע, שם תחנה, ותאריך פתיחת הדיווח עבור גניבת הכבודה בתאילנד.',
    sentAt: '2026-05-01T08:20:00.000Z',
    context:
      'ב-Pass 2 זוהה כי אישור המשטרה שצורף אינו כולל מספר אירוע. ללא מספר זה לא ניתן להשלים בדיקת כיסוי.',
    activityLog: [
      {
        at: '2026-05-01T08:20:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-05-01T08:21:00.000Z',
        actor: 'מערכת',
        action: 'סומנה כדחופה',
        details: 'חוסר במסמך חובה לכיסוי גניבה',
      },
      {
        at: '2026-05-01T13:15:00.000Z',
        actor: 'נועה לוי',
        action: 'נבדקה ידנית',
      },
      {
        at: '2026-05-02T07:00:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
        details: 'אחרי יום ללא תגובה',
      },
    ],
  },
  {
    id: 'q-002',
    claimId: '2024-004',
    status: 'pending',
    urgency: 'normal',
    // normal because routine clarification on receipt amount.
    questionText:
      'הסכום בקבלה אינו ברור. אנא אשר האם הסכום הוא 18,400 באט או 1,840 באט.',
    sentAt: '2026-04-30T10:10:00.000Z',
    context:
      'זיהוי OCR החזיר שתי אפשרויות סכום שונות ולכן נדרש אישור המבוטח לפני חישוב שווי בשקלים.',
    activityLog: [
      {
        at: '2026-04-30T10:10:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-30T10:12:00.000Z',
        actor: 'מערכת',
        action: 'קושרה למסמך קבלה',
      },
      {
        at: '2026-05-01T09:00:00.000Z',
        actor: 'מערכת',
        action: 'ממתינה לתשובה',
      },
      {
        at: '2026-05-02T06:30:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת מתוזמנת',
        details: 'תישלח אם לא תתקבל תשובה עד מחר',
      },
    ],
  },
  {
    id: 'q-003',
    claimId: '2024-006',
    status: 'pending',
    urgency: 'urgent',
    // urgent because medical coverage decision is blocked.
    questionText:
      'אנא צרף אישור ביקור במרפאה הכולל אבחנה ותאריך טיפול מלא כדי להשלים בדיקת כיסוי רפואי.',
    sentAt: '2026-05-01T15:45:00.000Z',
    context:
      'המסמך הרפואי שצורף כולל חשבונית בלבד ללא אבחנה. ההחלטה על כיסוי תלויה באבחנה.',
    activityLog: [
      {
        at: '2026-05-01T15:45:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-05-01T15:46:00.000Z',
        actor: 'מערכת',
        action: 'סומנה כדחופה',
        details: 'החלטת כיסוי חסומה',
      },
      {
        at: '2026-05-01T16:20:00.000Z',
        actor: 'אורי דיין',
        action: 'הוסיף הערת מעקב',
      },
      {
        at: '2026-05-02T08:00:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
      },
    ],
  },
  {
    id: 'q-004',
    claimId: '2024-008',
    status: 'pending',
    urgency: 'normal',
    // normal because routine trip-purpose clarification.
    questionText:
      'ציינת שהנסיעה הייתה עסקית ותיירותית. אנא פרט את חלוקת ימי הנסיעה בין עבודה לחופשה.',
    sentAt: '2026-04-28T09:05:00.000Z',
    context: 'מטרת הנסיעה משפיעה על פרשנות הכיסוי. המידע בטופס אינו חד-משמעי.',
    activityLog: [
      {
        at: '2026-04-28T09:05:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-29T09:05:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
      },
      {
        at: '2026-04-30T09:05:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 2/3 נשלחה',
      },
      {
        at: '2026-05-01T09:30:00.000Z',
        actor: 'נועה לוי',
        action: 'השאלה נותרה פתוחה',
      },
    ],
  },
  {
    id: 'q-005',
    claimId: '2024-009',
    status: 'pending',
    urgency: 'normal',
    // normal because claimant address is missing for contact follow-up.
    questionText:
      'אנא אשר כתובת דואר עדכנית לקבלת מכתב החלטה במקרה שנצטרך לשלוח מסמכים רשמיים.',
    sentAt: '2026-04-26T11:40:00.000Z',
    context:
      'פרטי הקשר בטופס כוללים אימייל וטלפון אך חסרה כתובת דואר למשלוח מסמכים.',
    activityLog: [
      {
        at: '2026-04-26T11:40:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-27T11:40:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
      },
      {
        at: '2026-04-29T11:40:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 2/3 נשלחה',
      },
      {
        at: '2026-05-01T12:10:00.000Z',
        actor: 'דנה כהן',
        action: 'עודכנה עדיפות רגילה',
      },
    ],
  },
  {
    id: 'q-006',
    claimId: '2024-001',
    status: 'answered',
    urgency: 'urgent',
    // urgent because store-not-found finding escalated risk to red.
    questionText:
      'אנא הסבר כיצד בוצעה הרכישה בחנות Trendy Electronics, וציין אם יש לך תיעוד נוסף של העסקה.',
    sentAt: '2026-04-29T12:00:00.000Z',
    answerText:
      'הרכישה בוצעה במזומן בקניון MBK בבנגקוק. אין לי תיעוד נוסף מלבד הקבלה, אבל צירפתי צילום של שקית החנות ושל האריזה.',
    answeredAt: '2026-05-02T06:15:00.000Z',
    context:
      'בדיקת העשרה לא מצאה רישום אמין לחנות בשם Trendy Electronics בכתובת שעל הקבלה.',
    attachments: ['store-bag.jpg', 'package-photo.webp'],
    activityLog: [
      {
        at: '2026-04-29T12:00:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-30T12:00:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
      },
      {
        at: '2026-05-02T06:15:00.000Z',
        actor: 'דוד כהן (מבוטח)',
        action: 'נשלחה תשובה',
        details: 'כולל 2 קבצים מצורפים',
      },
      {
        at: '2026-05-02T06:20:00.000Z',
        actor: 'מערכת',
        action: 'הועברה לסקירת נציג',
      },
    ],
  },
  {
    id: 'q-007',
    claimId: '2024-003',
    status: 'answered',
    urgency: 'normal',
    // normal because response clarifies travel companion details.
    questionText:
      'מי היה איתך בעת האירוע, והאם אותו אדם יכול לאשר את השתלשלות הדברים?',
    sentAt: '2026-04-28T08:00:00.000Z',
    answerText:
      'בן הזוג שלי היה איתי בזמן האירוע ויכול לאשר. צירפתי את פרטיו ואת הודעת הוואטסאפ שבה דיווחנו למלון.',
    answeredAt: '2026-05-01T17:35:00.000Z',
    context:
      'תיאור האירוע כולל עד אפשרי, אך בטופס המקורי לא נמסרו פרטי קשר או אישור חיצוני.',
    attachments: ['whatsapp-export.pdf'],
    activityLog: [
      {
        at: '2026-04-28T08:00:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-29T08:00:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
      },
      {
        at: '2026-05-01T17:35:00.000Z',
        actor: 'מיכל ברק (מבוטחת)',
        action: 'נשלחה תשובה',
        details: 'כולל קובץ מצורף',
      },
      {
        at: '2026-05-01T17:40:00.000Z',
        actor: 'מערכת',
        action: 'הועברה לסקירת נציג',
      },
    ],
  },
  {
    id: 'q-008',
    claimId: '2024-005',
    status: 'answered',
    urgency: 'normal',
    // normal because answer completes hotel confirmation gap.
    questionText:
      'האם הודעת למלון על האובדן לפני הצ׳ק-אאוט? אם כן, אנא צרף אישור או שם עובד שטיפל בנושא.',
    sentAt: '2026-04-27T14:25:00.000Z',
    answerText:
      'כן, הודעתי לדלפק הקבלה באותו ערב. העובדת בשם Lina רשמה את הפרטים ושלחה לי אישור במייל.',
    answeredAt: '2026-05-01T08:45:00.000Z',
    context:
      'לפי הפוליסה יש צורך בהודעה לגורם מקומי סמוך לאירוע. אישור המלון לא צורף בתחילה.',
    attachments: ['hotel-confirmation.eml'],
    activityLog: [
      {
        at: '2026-04-27T14:25:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-28T14:25:00.000Z',
        actor: 'מערכת',
        action: 'תזכורת 1/3 נשלחה',
      },
      {
        at: '2026-05-01T08:45:00.000Z',
        actor: 'רועי שלו (מבוטח)',
        action: 'נשלחה תשובה',
        details: 'כולל הודעת מייל',
      },
      {
        at: '2026-05-01T09:00:00.000Z',
        actor: 'מערכת',
        action: 'הועברה לסקירת נציג',
      },
    ],
  },
  {
    id: 'q-009',
    claimId: '2024-010',
    status: 'answered',
    urgency: 'urgent',
    // urgent because flight delay amount exceeds manual review threshold.
    questionText:
      'אנא אשר את שעת ההגעה בפועל ליעד הסופי וציין אם התקבל פיצוי מחברת התעופה.',
    sentAt: '2026-04-30T16:50:00.000Z',
    answerText:
      'הגענו ליעד בשעה 23:40 במקום 11:20. לא התקבל פיצוי מחברת התעופה, רק שוברים לאוכל בשדה.',
    answeredAt: '2026-05-02T09:05:00.000Z',
    context: 'משך העיכוב והאם התקבל פיצוי משפיעים על זכאות ועל סכום התשלום.',
    attachments: ['boarding-pass.pdf', 'airline-voucher.jpg'],
    activityLog: [
      {
        at: '2026-04-30T16:50:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-30T16:51:00.000Z',
        actor: 'מערכת',
        action: 'סומנה כדחופה',
      },
      {
        at: '2026-05-02T09:05:00.000Z',
        actor: 'יעל רוזן (מבוטחת)',
        action: 'נשלחה תשובה',
        details: 'כולל 2 קבצים מצורפים',
      },
      {
        at: '2026-05-02T09:10:00.000Z',
        actor: 'מערכת',
        action: 'הועברה לסקירת נציג',
      },
    ],
  },
  {
    id: 'q-010',
    claimId: '2024-002',
    status: 'closed',
    urgency: 'normal',
    // normal because resolved baggage ownership clarification.
    questionText: 'אנא אשר שהמחשב הנייד היה בבעלותך האישית ולא רכוש מעסיק.',
    sentAt: '2026-04-23T10:30:00.000Z',
    answerText: 'המחשב היה בבעלותי האישית. צירפתי חשבונית רכישה על שמי.',
    answeredAt: '2026-04-25T09:20:00.000Z',
    resolvedBy: 'נועה לוי',
    resolutionNote: 'החשבונית תואמת לשם המבוטח. אין צורך בהבהרה נוספת.',
    context: 'סוג הבעלות משפיע על החרגות פוליסה לגבי ציוד עבודה.',
    attachments: ['laptop-invoice.pdf'],
    activityLog: [
      {
        at: '2026-04-23T10:30:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-25T09:20:00.000Z',
        actor: 'אמיר שחר (מבוטח)',
        action: 'נשלחה תשובה',
        details: 'כולל חשבונית רכישה',
      },
      {
        at: '2026-04-25T11:00:00.000Z',
        actor: 'נועה לוי',
        action: 'התשובה אושרה',
      },
      {
        at: '2026-04-25T11:02:00.000Z',
        actor: 'מערכת',
        action: 'השאלה נסגרה',
      },
    ],
  },
  {
    id: 'q-011',
    claimId: '2024-007',
    status: 'closed',
    urgency: 'urgent',
    // urgent because passport-loss claim required official report.
    questionText: 'אנא צרף אישור שגרירות או אישור משטרה על אובדן הדרכון.',
    sentAt: '2026-04-20T07:30:00.000Z',
    answerText:
      'צירפתי אישור מהשגרירות הישראלית ברומא ואישור תלונה מהמשטרה המקומית.',
    answeredAt: '2026-04-21T12:10:00.000Z',
    resolvedBy: 'אורי דיין',
    resolutionNote: 'שני האישורים התקבלו ונבדקו. המסמכים מספקים.',
    context: 'אובדן דרכון מחייב אסמכתה רשמית כדי למנוע כפל תביעה.',
    attachments: ['embassy-letter.pdf', 'police-report.pdf'],
    activityLog: [
      {
        at: '2026-04-20T07:30:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-20T07:31:00.000Z',
        actor: 'מערכת',
        action: 'סומנה כדחופה',
      },
      {
        at: '2026-04-21T12:10:00.000Z',
        actor: 'ליאת פרץ (מבוטחת)',
        action: 'נשלחה תשובה',
        details: 'כולל 2 מסמכים',
      },
      {
        at: '2026-04-21T14:00:00.000Z',
        actor: 'אורי דיין',
        action: 'השאלה נסגרה',
      },
    ],
  },
  {
    id: 'q-012',
    claimId: '2024-011',
    status: 'closed',
    urgency: 'normal',
    // normal because routine claim-date mismatch was resolved.
    questionText:
      'תאריך האירוע בטופס אינו תואם לתאריך במסמך. אנא אשר את התאריך הנכון.',
    sentAt: '2026-04-18T13:15:00.000Z',
    answerText: 'התאריך הנכון הוא 14/04/2026. בטופס נבחר בטעות 15/04/2026.',
    answeredAt: '2026-04-19T08:05:00.000Z',
    resolvedBy: 'דנה כהן',
    resolutionNote: 'התאריך עודכן בבריף. אין השפעה על הכיסוי.',
    context: 'פער של יום בין טופס המבוטח למסמך האירוע.',
    activityLog: [
      {
        at: '2026-04-18T13:15:00.000Z',
        actor: 'מערכת',
        action: 'שאלה נשלחה למבוטח',
      },
      {
        at: '2026-04-19T08:05:00.000Z',
        actor: 'גיל כהן (מבוטח)',
        action: 'נשלחה תשובה',
      },
      {
        at: '2026-04-19T08:20:00.000Z',
        actor: 'דנה כהן',
        action: 'התאריך עודכן',
      },
      {
        at: '2026-04-19T08:22:00.000Z',
        actor: 'מערכת',
        action: 'השאלה נסגרה',
      },
    ],
  },
];
