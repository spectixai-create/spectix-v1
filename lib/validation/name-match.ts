import {
  getFieldsByKind,
  type collectNormalizedExtractionFields,
} from './normalized-fields';
import { normalizeComparableName, similarity } from './string-similarity';
import type {
  NameMatchOutcome,
  NameMatchPayload,
  ValidationLayerResult,
} from './types';

const FUZZY_THRESHOLD = 0.85;

type Collection = ReturnType<typeof collectNormalizedExtractionFields>;

export function runNameMatchLayer(
  collection: Collection,
): ValidationLayerResult<NameMatchPayload> {
  const allNameFields = getFieldsByKind(collection, 'name');
  const nameFields = allNameFields.filter(
    (field) => field.route !== 'witness_letter',
  );
  const witnessExcluded = allNameFields.length - nameFields.length;

  if (nameFields.length === 0) {
    return {
      layer_id: '11.1',
      status: 'skipped',
      payload: {
        canonical_name: null,
        outcome: 'skipped',
        reason: 'no_name_fields',
        candidates: [],
        summary: {
          total_name_fields: 0,
          exact_matches: 0,
          fuzzy_matches: 0,
          mismatches: 0,
          witness_name_fields_excluded: witnessExcluded,
          skipped_broad_fallback_documents:
            collection.skipped_broad_fallback.length,
        },
      },
    };
  }

  const canonical = chooseCanonicalName(
    nameFields.map((field) => String(field.value)),
  );
  const normalizedCanonical = normalizeComparableName(canonical);
  let exact = 0;
  let fuzzy = 0;
  let mismatch = 0;

  const candidates = nameFields.map((field) => {
    const value = String(field.value);
    const normalized = normalizeComparableName(value);
    const score = similarity(normalized, normalizedCanonical);
    const match: NameMatchOutcome =
      normalized === normalizedCanonical
        ? 'exact'
        : score >= FUZZY_THRESHOLD
          ? 'fuzzy'
          : 'mismatch';

    if (match === 'exact') exact += 1;
    if (match === 'fuzzy') fuzzy += 1;
    if (match === 'mismatch') mismatch += 1;

    return {
      value,
      normalized,
      evidence: {
        document_id: field.document_id,
        field_path: field.field_path,
        raw_value: field.raw_value,
        normalized_value: field.normalized_value,
      },
      match,
      similarity: Number(score.toFixed(4)),
    };
  });

  return {
    layer_id: '11.1',
    status: 'completed',
    payload: {
      canonical_name: canonical,
      outcome: mismatch > 0 ? 'mismatch' : fuzzy > 0 ? 'fuzzy' : 'exact',
      candidates,
      summary: {
        total_name_fields: nameFields.length,
        exact_matches: exact,
        fuzzy_matches: fuzzy,
        mismatches: mismatch,
        witness_name_fields_excluded: witnessExcluded,
        skipped_broad_fallback_documents:
          collection.skipped_broad_fallback.length,
      },
    },
  };
}

function chooseCanonicalName(values: string[]): string {
  const sorted = [...values].sort((a, b) => {
    const left = normalizeComparableName(a);
    const right = normalizeComparableName(b);
    return left.localeCompare(right) || a.localeCompare(b);
  });
  const counts = new Map<string, { value: string; count: number }>();

  for (const value of sorted) {
    const normalized = normalizeComparableName(value);
    const current = counts.get(normalized);
    counts.set(normalized, {
      value: current?.value ?? value,
      count: (current?.count ?? 0) + 1,
    });
  }

  return (
    Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value),
    )[0]?.value ??
    sorted[0] ??
    ''
  );
}
