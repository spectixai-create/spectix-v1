import { generateQuestionId } from './id-generation';
import type {
  ClarificationQuestion,
  Finding,
  QuestionAnswerType,
} from './types';

export function generateQuestionsForFindings(
  findings: Finding[],
): ClarificationQuestion[] {
  return findings.flatMap((finding) => {
    const template = templateForFinding(finding);
    if (!template) return [];

    const seed = {
      related_finding_id: finding.id,
      text: template.text,
      expected_answer_type: template.expectedAnswerType,
    };

    return [
      {
        id: generateQuestionId(seed),
        text: template.text,
        related_finding_id: finding.id,
        expected_answer_type: template.expectedAnswerType,
        context: {
          finding_title: finding.title,
          source_layer_id: finding.source_layer_id ?? null,
        },
      },
    ];
  });
}

function templateForFinding(
  finding: Finding,
): { text: string; expectedAnswerType: QuestionAnswerType } | null {
  if (finding.title.startsWith('שכבה ') && finding.title.endsWith('לא רצה')) {
    return null;
  }
  if (finding.title.includes('כשלה')) return null;

  if (finding.category === 'gap') {
    if (finding.title.includes('מסמך')) {
      return {
        expectedAnswerType: 'document',
        text: 'נא העלה את המסמך החסר כדי להמשיך בעיבוד התביעה',
      };
    }

    return {
      expectedAnswerType: 'correction',
      text: 'חסר מידע נדרש בתביעה. נא לתקן את הפרטים או להעלות מסמך מעודכן',
    };
  }

  if (
    finding.category === 'inconsistency' &&
    finding.severity === 'high' &&
    finding.source_layer_id === '11.1'
  ) {
    return {
      expectedAnswerType: 'confirmation',
      text: 'נמצאה אי-התאמה בשם בין מסמכים. האם מדובר באותו אדם?',
    };
  }

  if (
    finding.category === 'inconsistency' &&
    finding.severity === 'medium' &&
    finding.source_layer_id === '11.1'
  ) {
    return null;
  }

  if (finding.category === 'inconsistency') {
    return {
      expectedAnswerType: 'text',
      text: 'נמצאה אי-התאמה בתאריכים בין מסמכים. נא להבהיר את התאריכים הנכונים',
    };
  }

  if (finding.category === 'anomaly') {
    return {
      expectedAnswerType: 'text',
      text: 'נמצא סכום חריג ביחס לסכומים אחרים בתביעה. נא להסביר את הסכום',
    };
  }

  return null;
}
