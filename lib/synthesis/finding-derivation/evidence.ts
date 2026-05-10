import type { EvidenceRef } from '@/lib/validation';

export function collectEvidence(value: unknown): EvidenceRef[] {
  const refs: EvidenceRef[] = [];
  const seen = new Set<string>();

  walk(value, (candidate) => {
    if (!isEvidenceRef(candidate)) return;

    const ref: EvidenceRef = {
      document_id: candidate.document_id,
      field_path: candidate.field_path,
    };
    if (typeof candidate.raw_value === 'string')
      ref.raw_value = candidate.raw_value;
    if (typeof candidate.normalized_value === 'string') {
      ref.normalized_value = candidate.normalized_value;
    }
    if (typeof candidate.expected_value === 'string') {
      ref.expected_value = candidate.expected_value;
    }
    if (typeof candidate.found_value === 'string') {
      ref.found_value = candidate.found_value;
    }
    if (typeof candidate.source_quote === 'string') {
      ref.source_quote = candidate.source_quote;
    }
    if (typeof candidate.explanation === 'string') {
      ref.explanation = candidate.explanation;
    }
    if (typeof candidate.recommended_action === 'string') {
      ref.recommended_action = candidate.recommended_action;
    }

    const key = `${ref.document_id}:${ref.field_path}:${ref.raw_value ?? ''}:${ref.normalized_value ?? ''}:${ref.expected_value ?? ''}:${ref.found_value ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  });

  return refs;
}

function walk(value: unknown, visit: (value: unknown) => void) {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const item of Object.values(value)) walk(item, visit);
}

function isEvidenceRef(value: unknown): value is EvidenceRef {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EvidenceRef>;
  return (
    typeof candidate.document_id === 'string' &&
    typeof candidate.field_path === 'string'
  );
}

export function numberAt(
  value: Record<string, unknown>,
  path: string[],
): number {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== 'object') return 0;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'number' && Number.isFinite(current) ? current : 0;
}

export function arrayAt<T = Record<string, unknown>>(
  value: Record<string, unknown>,
  key: string,
): T[] {
  const candidate = value[key];
  return Array.isArray(candidate) ? (candidate as T[]) : [];
}
