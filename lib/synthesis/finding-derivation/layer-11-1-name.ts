import { generateFindingId } from '../id-generation';
import type { ClaimValidationRow, Finding } from '../types';
import { collectEvidence, numberAt } from './evidence';

export function deriveNameFindings(row: ClaimValidationRow): Finding[] {
  const payload = row.payload;
  const evidence = collectEvidence(payload);

  if (row.status === 'failed') {
    return [
      finding({
        severity: 'high',
        title: 'בדיקת השם כשלה',
        description: 'שכבת התאמת השם נכשלה ולכן נדרש בירור ידני.',
        evidence,
      }),
    ];
  }

  if (row.status === 'skipped' && payload.reason === 'no_name_fields') {
    return [
      finding({
        severity: 'medium',
        title: 'לא נמצאו שדות שם לבדיקה',
        description: 'לא נמצאו שדות שם במסמכי התביעה שניתן להשוות ביניהם.',
        evidence,
      }),
    ];
  }

  const mismatch = numberAt(payload, ['summary', 'mismatches']);
  const fuzzy = numberAt(payload, ['summary', 'fuzzy_matches']);

  if (mismatch > 0) {
    return [
      finding({
        severity: 'high',
        title: 'אי-התאמה בשם בין מסמכים',
        description: 'נמצאו שמות שונים במסמכי התביעה ונדרש אישור זהות.',
        evidence,
      }),
    ];
  }

  if (fuzzy > 0) {
    return [
      finding({
        severity: 'medium',
        title: 'התאמה חלקית בשם',
        description: 'נמצאה התאמת שם חלקית בין מסמכים.',
        evidence,
      }),
    ];
  }

  return [];
}

function finding(
  input: Omit<Finding, 'id' | 'category' | 'source_layer_id'>,
): Finding {
  const category =
    input.title === 'לא נמצאו שדות שם לבדיקה' ||
    input.title === 'בדיקת השם כשלה'
      ? 'gap'
      : 'inconsistency';
  const seed = {
    category,
    source_layer_id: '11.1',
    severity: input.severity,
    title: input.title,
    evidence: input.evidence,
  } as const;

  return {
    ...input,
    id: generateFindingId(seed),
    category,
    source_layer_id: '11.1',
  };
}
