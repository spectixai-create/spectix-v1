import { createHash } from 'crypto';

import stringify from 'safe-stable-stringify';

export function generateFindingId(payload: unknown): string {
  return `f_${digest(payload)}`;
}

export function generateQuestionId(payload: unknown): string {
  return `q_${digest(payload)}`;
}

function digest(payload: unknown): string {
  const stable = stringify(payload);
  if (typeof stable !== 'string') {
    throw new Error('safe-stable-stringify failed to serialize ID payload');
  }

  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}
