import { generateQuestionId } from './id-generation';
import type {
  ClarificationQuestion,
  Finding,
  QuestionAnswerType,
  QuestionRequiredAction,
} from './types';

export function generateQuestionsForFindings(
  findings: Finding[],
): ClarificationQuestion[] {
  const seenQuestions = new Set<string>();

  return findings.flatMap((finding) => {
    const template = generateCustomerQuestionFromFinding(finding);
    if (!template) return [];
    if (seenQuestions.has(template.question)) return [];
    seenQuestions.add(template.question);

    const seed = {
      related_finding_id: finding.id,
      text: template.question,
      expected_answer_type: template.expectedAnswerType,
      required_action: template.required_action,
      customer_label: template.customer_label,
    };

    return [
      {
        id: generateQuestionId(seed),
        text: template.question,
        related_finding_id: finding.id,
        expected_answer_type: template.expectedAnswerType,
        required_action: template.required_action,
        customer_label: template.customer_label,
        context: {
          finding_title: finding.title,
          customer_label: template.customer_label,
          required_action: template.required_action,
          source_layer_id: finding.source_layer_id ?? null,
        },
      },
    ];
  });
}

export function generateCustomerQuestionFromFinding(finding: Finding): {
  question: string;
  required_action: QuestionRequiredAction;
  customer_label: string;
  expectedAnswerType: QuestionAnswerType;
} | null {
  if (finding.title.startsWith('שכבה ') && finding.title.endsWith('לא רצה')) {
    return null;
  }
  if (finding.title.includes('כשלה')) return null;
  if (
    finding.category === 'inconsistency' &&
    finding.severity === 'medium' &&
    finding.source_layer_id === '11.1'
  ) {
    return null;
  }

  const key = searchableFindingText(finding);
  const consistencyTemplate = templateForConsistencyFinding(finding.title);
  if (consistencyTemplate) return consistencyTemplate;

  if (isReviewOnlyTheftFinding(key)) return null;

  const mapped = templateByKeywords(key);
  if (mapped) return mapped;

  return template({
    question: `נדרש מסמך או הסבר נוסף עבור הממצא: ${finding.title}. נא להשלים את הפרטים החסרים כדי שניתן יהיה להמשיך בבדיקת התביעה.`,
    customer_label: 'השלמת מידע',
    required_action: 'upload_document_or_answer',
  });
}

function templateForConsistencyFinding(title: string) {
  if (title === 'סוג המסמכים אינו תואם לסוג התביעה') {
    return template({
      question:
        'המסמכים שצורפו נראים כמסמכים שאינם תואמים לסוג התביעה. נא להעלות מסמכים רלוונטיים לסוג התביעה שנבחר, או לאשר שיש לעדכן את סוג התביעה.',
      customer_label: 'התאמת מסמכים לסוג תביעה',
      required_action: 'upload_document_or_answer',
    });
  }

  if (title === 'תיאור האירוע אינו תואם לסוג התביעה') {
    return template({
      question:
        'נא לאשר האם התביעה היא בגין גניבה או בגין אירוע רפואי/תאונה, ולצרף מסמכים תומכים בהתאם.',
      customer_label: 'אימות סוג תביעה',
      required_action: 'answer',
    });
  }

  if (title === 'סכום התביעה אינו תואם לסכום הפריטים') {
    return template({
      question:
        'נא לאשר את סכום התביעה הכולל ואת סכומי הפריטים שנגנבו, או לתקן את רשימת הפריטים בהתאם.',
      customer_label: 'אימות סכום תביעה',
      required_action: 'answer',
    });
  }

  return null;
}

function templateByKeywords(key: string) {
  if (matches(key, ['police_report', 'police', 'משטרה', 'אישור משטרה'])) {
    return template({
      question:
        'נא להעלות אישור משטרה מקומית על הגניבה, הכולל שם מלא, תאריך אירוע ומיקום.',
      customer_label: 'אישור משטרה',
      required_action: 'upload_document',
    });
  }

  if (
    matches(key, [
      'valuable',
      'jewelry',
      'electronics',
      'חפץ ערך',
      'יקר',
      'תכשיט',
      'אלקטרוניקה',
    ])
  ) {
    return template({
      question: 'נא להעלות קבלה או הוכחת בעלות עבור הפריט היקר שנתבע.',
      customer_label: 'הוכחת בעלות לפריט יקר',
      required_action: 'upload_document',
    });
  }

  if (
    matches(key, [
      'receipt',
      'proof',
      'ownership',
      'קבלה',
      'בעלות',
      'הוכחות בעלות',
    ])
  ) {
    return template({
      question: 'נא להעלות קבלות או הוכחות בעלות עבור הפריטים שנתבעו.',
      customer_label: 'קבלות / הוכחות בעלות',
      required_action: 'upload_document',
    });
  }

  if (
    matches(key, [
      'supervision',
      'unattended',
      'השגחה',
      'ללא השגחה',
      'תחת השגחה',
    ])
  ) {
    return template({
      question: 'נא להבהיר היכן היה התיק בזמן הגניבה והאם היה תחת השגחה.',
      customer_label: 'נסיבות שמירה על התיק',
      required_action: 'answer',
    });
  }

  if (
    matches(key, [
      'event_date',
      'incident_date',
      'date',
      'תאריך',
      'מועד',
      'תאריכים',
    ])
  ) {
    return template({
      question:
        'נא להעלות מסמך הכולל את תאריך האירוע, או להבהיר בכתב את מועד הגניבה.',
      customer_label: 'תאריך אירוע',
      required_action: 'upload_document_or_answer',
    });
  }

  if (
    matches(key, [
      'item_list',
      'missing item list',
      'items list',
      'stolen item list',
      'רשימת פריטים',
      'חסרה רשימת פריטים',
    ])
  ) {
    return template({
      question: 'נא להעלות רשימת פריטים שנגנבו, כולל תיאור כל פריט וסכום נתבע.',
      customer_label: 'רשימת פריטים',
      required_action: 'upload_document_or_answer',
    });
  }

  if (
    matches(key, [
      'location',
      'country',
      'city',
      'destination',
      'מיקום',
      'עיר',
      'מדינה',
      'יעד',
    ])
  ) {
    return template({
      question: 'נא להבהיר באיזו מדינה, עיר ומיקום מדויק אירעה הגניבה.',
      customer_label: 'מיקום אירוע',
      required_action: 'answer',
    });
  }

  if (
    matches(key, [
      'purchase',
      'departure',
      'policy_coverage',
      'יציאה',
      'רכישה',
      'כיסוי',
    ])
  ) {
    return template({
      question: 'נא להעלות אסמכתא לתאריך היציאה מהארץ ולמועד רכישת הביטוח.',
      customer_label: 'תאריך יציאה ומועד רכישת ביטוח',
      required_action: 'upload_document',
    });
  }

  if (matches(key, ['name', 'insured', 'שם', 'מבוטח'])) {
    return template({
      question:
        'נא להעלות מסמך שבו מופיע שמך המלא, או אישור משטרה מעודכן הכולל שם מלא.',
      customer_label: 'מסמך עם שם מלא',
      required_action: 'upload_document',
    });
  }

  return null;
}

function isReviewOnlyTheftFinding(key: string): boolean {
  return matches(key, [
    'גניבה מרכב',
    'מזומן דווח',
    'מזומן מוחרג',
    'תאריך האירוע מחוץ לתקופת הביטוח',
    'יעד האירוע אינו תואם',
    'כיסוי כבודה אינו פעיל',
    'סכום הפריט מעל תקרת הכיסוי',
    'סכום התביעה מעל תקרת כיסוי',
    'cash item',
    'cash excluded',
    'theft from vehicle',
    'outside coverage period',
    'per-item limit',
    'total baggage limit',
  ]);
}

function template(input: {
  question: string;
  customer_label: string;
  required_action: QuestionRequiredAction;
}) {
  return {
    ...input,
    expectedAnswerType: answerTypeForAction(input.required_action),
  };
}

function answerTypeForAction(
  action: QuestionRequiredAction,
): QuestionAnswerType {
  if (action === 'upload_document') return 'document';
  return 'text';
}

function searchableFindingText(finding: Finding): string {
  const dynamicFinding = finding as unknown as Record<string, unknown>;
  const values = [
    stringField(dynamicFinding, 'rule_id'),
    stringField(dynamicFinding, 'field'),
    stringField(dynamicFinding, 'field_path'),
    finding.category,
    finding.title,
    finding.description,
    finding.source_layer_id,
    ...finding.evidence.flatMap((evidence) => [
      evidence.field_path,
      evidence.raw_value,
      evidence.normalized_value,
      evidence.expected_value,
      evidence.found_value,
      evidence.explanation,
      evidence.recommended_action,
    ]),
  ];

  return values.filter(Boolean).join(' ').toLocaleLowerCase('he-IL');
}

function stringField(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const field = value[key];
  return typeof field === 'string' ? field : null;
}

function matches(value: string, keywords: string[]): boolean {
  const normalized = value.toLocaleLowerCase('he-IL');
  return keywords.some((keyword) =>
    normalized.includes(keyword.toLocaleLowerCase('he-IL')),
  );
}
