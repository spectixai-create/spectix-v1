import type {
  ClaimType,
  ClaimStatus,
  DocumentProcessingStatus,
  PassStatus,
} from '@/lib/types';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  intake: 'נקלט',
  processing: 'בעיבוד',
  pending_info: 'ממתין למידע',
  ready: 'מוכן להחלטה',
  reviewed: 'נבדק',
  rejected_no_coverage: 'נדחה - ללא כיסוי',
  cost_capped: 'נעצר עקב תקרת עלות',
  errored: 'שגיאת מערכת',
};

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בעיבוד',
  completed: 'הושלם',
  skipped: 'דולג',
  failed: 'נכשל',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentProcessingStatus, string> =
  {
    pending: 'ממתין',
    processing: 'בעיבוד',
    processed: 'מוכן',
    failed: 'נכשל',
  };

export const BRIEF_TABS = {
  findings: 'ממצאים',
  documents: 'מסמכים',
  validation: 'בדיקות תיק',
  audit: 'היסטוריית פעולות',
} as const;

export const ADJUSTER_ACTIONS = {
  approve: 'אישור',
  reject: 'דחייה',
  escalate: 'העברה לחוקר',
  unescalate: 'הסרת העברה',
  requestInfo: 'בקשת מידע',
  refresh: 'רענון',
} as const;

export const EMPTY_STATES = {
  claims: 'לא נמצאו תיקים תואמים',
  findings: 'אין ממצאים להצגה',
  documents: 'אין מסמכים להצגה',
  validations: 'אין בדיקות תיק להצגה',
  audit: 'אין פעולות להצגה',
  questions: 'אין שאלות לשליחה',
} as const;

export const FINDING_CATEGORY_LABELS: Record<string, string> = {
  gap: 'פער מידע',
  anomaly: 'חריגה',
  inconsistency: 'אי-התאמה',
};

export const VALIDATION_STATUS_LABELS: Record<string, string> = {
  completed: 'הושלם',
  skipped: 'דולג',
  failed: 'נכשל',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  adjuster_decision_approve: 'החלטת מתאם: אישור',
  adjuster_decision_reject: 'החלטת מתאם: דחייה',
  adjuster_request_info: 'בקשת מידע נשלחה',
  adjuster_escalate: 'העברה לחוקר',
  adjuster_unescalate: 'ביטול העברה לחוקר',
  claim_created: 'תיק נפתח',
  document_uploaded: 'מסמך הועלה',
  claim_synthesis_started: 'ניתוח תיק התחיל',
  claim_synthesis_completed: 'ניתוח תיק הושלם',
  claim_validation_layer_started: 'בדיקת תיק התחילה',
  claim_validation_layer_completed: 'בדיקת תיק הושלמה',
  claim_validation_layer_failed: 'בדיקת תיק נכשלה',
  claim_validation_layer_skipped: 'בדיקת תיק דולגה',
  claim_rejected: 'התיק נדחה',
  claim_status_changed: 'סטטוס תיק השתנה',
  claim_rejection_email_failed: 'שליחת הודעת דחייה נכשלה',
};

export const DOCUMENT_LABELS: Record<string, string> = {
  receipt: 'קבלה',
  general_receipt: 'קבלה כללית',
  police_report: 'דוח משטרה',
  medical_report: 'מסמך רפואי',
  medical_visit: 'ביקור רפואי',
  hotel_letter: 'מכתב מלון',
  flight_doc: 'מסמך טיסה',
  flight_booking: 'הזמנת טיסה',
  flight_ticket: 'כרטיס טיסה',
  flight_booking_or_ticket: 'הזמנת/כרטיס טיסה',
  boarding_pass: 'כרטיס עלייה למטוס',
  witness_letter: 'מכתב עד',
  witnesses: 'עדות',
  other: 'אחר',
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  theft: 'גניבה',
  baggage: 'כבודה',
  medical: 'רפואי',
  flight_delay: 'עיכוב טיסה',
  flight_cancellation: 'ביטול טיסה',
  loss: 'אובדן',
  liability: 'אחריות צד ג׳',
  emergency: 'חירום',
  misrepresentation: 'אי-התאמה / הצהרה שגויה',
  other: 'אחר',
};

export function getClaimTypeLabel(
  claimType: string | null | undefined,
  fallback = 'לא סווג',
): string {
  if (!claimType) return fallback;

  return CLAIM_TYPE_LABELS[claimType as ClaimType] ?? fallback;
}
