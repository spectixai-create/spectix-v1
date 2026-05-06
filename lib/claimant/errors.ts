export type ClaimantRpcErrorCode =
  | 'token_not_found'
  | 'token_used'
  | 'token_revoked'
  | 'token_expired'
  | 'incomplete_responses'
  | 'question_not_dispatched'
  | 'document_not_found'
  | 'no_questions_dispatched'
  | 'claim_not_pending_info'
  | 'claim_not_found'
  | 'db_error';

export type ClaimantRpcErrorResponse = {
  status: number;
  code: ClaimantRpcErrorCode;
  message: string;
};

export function mapClaimantRpcError(error: {
  code?: string | null;
  message?: string | null;
}): ClaimantRpcErrorResponse {
  const marker = error.message ?? '';

  if (error.code === 'P0002' || marker.includes('token_used')) {
    return { status: 410, code: 'token_used', message: 'הקישור כבר נוצל' };
  }

  if (error.code === 'P0003' || marker.includes('token_revoked')) {
    return { status: 401, code: 'token_revoked', message: 'הקישור בוטל' };
  }

  if (error.code === 'P0004' || marker.includes('token_expired')) {
    return { status: 401, code: 'token_expired', message: 'תוקף הקישור פג' };
  }

  if (error.code === 'P0005' || marker.includes('incomplete_responses')) {
    return {
      status: 400,
      code: 'incomplete_responses',
      message: 'יש לענות על כל השאלות לפני שליחה',
    };
  }

  if (error.code === 'P0006' || marker.includes('question_not_dispatched')) {
    return {
      status: 400,
      code: 'question_not_dispatched',
      message: 'השאלה אינה משויכת לתיק',
    };
  }

  if (error.code === 'P0007' || marker.includes('document_not_found')) {
    return {
      status: 404,
      code: 'document_not_found',
      message: 'המסמך לא נמצא',
    };
  }

  if (error.code === 'P0008' || marker.includes('no_questions_dispatched')) {
    return {
      status: 400,
      code: 'no_questions_dispatched',
      message: 'לא נמצאו שאלות לשליחה',
    };
  }

  if (error.code === 'P0009' || marker.includes('claim_not_pending_info')) {
    return {
      status: 409,
      code: 'claim_not_pending_info',
      message: 'לא ניתן לשלוח תשובות בשלב הנוכחי של התביעה',
    };
  }

  if (error.code === 'P0010' || marker.includes('claim_not_found')) {
    return {
      status: 404,
      code: 'claim_not_found',
      message: 'התביעה לא נמצאה',
    };
  }

  if (error.code === 'P0001' || marker.includes('token_not_found')) {
    return {
      status: 401,
      code: 'token_not_found',
      message: 'הקישור אינו תקין',
    };
  }

  return { status: 500, code: 'db_error', message: 'שגיאת מערכת' };
}
