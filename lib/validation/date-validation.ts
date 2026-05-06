import {
  getFieldsByKind,
  type collectNormalizedExtractionFields,
} from './normalized-fields';
import type {
  DateRuleResult,
  DateValidationPayload,
  EvidenceRef,
  ValidationClaimContext,
  ValidationLayerResult,
} from './types';

type Collection = ReturnType<typeof collectNormalizedExtractionFields>;

export function runDateValidationLayer({
  collection,
  claim,
}: {
  collection: Collection;
  claim: ValidationClaimContext;
}): ValidationLayerResult<DateValidationPayload> {
  const dateRefs = getFieldsByKind(collection, 'date');
  const timeline = dateRefs.flatMap((field) =>
    parseDateOnlyValues(String(field.value)).map((date) => ({
      date,
      source: toEvidence(field),
    })),
  );

  if (timeline.length === 0) {
    return {
      layer_id: '11.2',
      status: 'skipped',
      payload: {
        reason: 'no_dates',
        timeline: [],
        rules: skippedRules('no_dates'),
        summary: {
          total_date_fields: 0,
          pass: 0,
          fail: 0,
          skipped: 4,
          skipped_broad_fallback_documents:
            collection.skipped_broad_fallback.length,
        },
      },
    };
  }

  const rules = [
    policyCoverageRule(claim),
    submissionTimingRule(claim),
    travelContainmentRule(claim, timeline),
    documentAgeRule(timeline, claim),
  ];

  return {
    layer_id: '11.2',
    status: 'completed',
    payload: {
      timeline,
      rules,
      summary: {
        total_date_fields: timeline.length,
        pass: rules.filter((rule) => rule.status === 'pass').length,
        fail: rules.filter((rule) => rule.status === 'fail').length,
        skipped: rules.filter((rule) => rule.status === 'skipped').length,
        skipped_broad_fallback_documents:
          collection.skipped_broad_fallback.length,
      },
    },
  };
}

export function parseDateOnlyValues(value: string): string[] {
  const matches = value.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{4}/g);
  if (!matches) return [];

  return matches
    .map(normalizeDateOnly)
    .filter((date): date is string => date !== null);
}

function normalizeDateOnly(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return isValidDate(trimmed) ? trimmed : null;

  const match = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const normalized = `${yyyy}-${ddOrMm(mm)}-${ddOrMm(dd)}`;
  return isValidDate(normalized) ? normalized : null;
}

function ddOrMm(value: string | undefined): string {
  return String(value ?? '').padStart(2, '0');
}

function isValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function policyCoverageRule(claim: ValidationClaimContext): DateRuleResult {
  const metadata = claim.metadata ?? {};
  const start = stringValue(
    metadata.policy_start_date ?? metadata.policyStartDate,
  );
  const end = stringValue(metadata.policy_end_date ?? metadata.policyEndDate);
  const incident = normalizeDateOnly(claim.incidentDate ?? '');

  if (!start || !end || !incident) {
    return {
      rule_id: 'policy_coverage',
      status: 'skipped',
      reason: 'missing_policy_or_incident_date',
      evidence: [],
    };
  }

  const normalizedStart = normalizeDateOnly(start);
  const normalizedEnd = normalizeDateOnly(end);
  if (!normalizedStart || !normalizedEnd) {
    return {
      rule_id: 'policy_coverage',
      status: 'skipped',
      reason: 'invalid_policy_dates',
      evidence: [],
    };
  }

  return {
    rule_id: 'policy_coverage',
    status:
      incident >= normalizedStart && incident <= normalizedEnd
        ? 'pass'
        : 'fail',
    evidence: [
      {
        document_id: claim.id,
        field_path: 'claims.incident_date',
        normalized_value: incident,
      },
    ],
  };
}

function submissionTimingRule(claim: ValidationClaimContext): DateRuleResult {
  const incident = normalizeDateOnly(claim.incidentDate ?? '');
  const submitted = normalizeDateOnly((claim.createdAt ?? '').slice(0, 10));

  if (!incident || !submitted) {
    return {
      rule_id: 'submission_timing',
      status: 'skipped',
      reason: 'missing_incident_or_submission_date',
      evidence: [],
    };
  }

  return {
    rule_id: 'submission_timing',
    status: submitted >= incident ? 'pass' : 'fail',
    evidence: [
      {
        document_id: claim.id,
        field_path: 'claims.created_at',
        normalized_value: submitted,
      },
    ],
  };
}

function travelContainmentRule(
  claim: ValidationClaimContext,
  timeline: DateValidationPayload['timeline'],
): DateRuleResult {
  const incident = normalizeDateOnly(claim.incidentDate ?? '');
  const travelDates = timeline
    .filter((item) =>
      /departure|arrival|flight|boarding|stay/i.test(item.source.field_path),
    )
    .map((item) => item.date)
    .sort();

  if (!incident || travelDates.length < 2) {
    return {
      rule_id: 'travel_containment',
      status: 'skipped',
      reason: 'missing_incident_or_travel_range',
      evidence: travelDates.map((date) => ({
        document_id: claim.id,
        field_path: 'validation.timeline.travel_date',
        normalized_value: date,
      })),
    };
  }

  return {
    rule_id: 'travel_containment',
    status:
      incident >= (travelDates[0] ?? incident) &&
      incident <= (travelDates[travelDates.length - 1] ?? incident)
        ? 'pass'
        : 'fail',
    evidence: timeline
      .filter((item) => travelDates.includes(item.date))
      .map((item) => item.source),
  };
}

function documentAgeRule(
  timeline: DateValidationPayload['timeline'],
  claim: ValidationClaimContext,
): DateRuleResult {
  const incident = normalizeDateOnly(claim.incidentDate ?? '');
  if (!incident) {
    return {
      rule_id: 'document_age',
      status: 'skipped',
      reason: 'missing_incident_date',
      evidence: [],
    };
  }

  const documentDates = timeline.filter((item) =>
    isDocumentReportDatePath(item.source.field_path),
  );

  if (documentDates.length === 0) {
    return {
      rule_id: 'document_age',
      status: 'skipped',
      reason: 'missing_document_dates',
      evidence: [],
    };
  }

  const beforeIncident = documentDates.filter((item) => item.date < incident);

  return {
    rule_id: 'document_age',
    status: beforeIncident.length > 0 ? 'fail' : 'pass',
    reason:
      beforeIncident.length > 0
        ? 'document_date_before_incident_date'
        : undefined,
    evidence: beforeIncident.map((item) => item.source),
  };
}

function isDocumentReportDatePath(fieldPath: string): boolean {
  return /report_or_filing_date|visit_date|letter_date|transaction_date/i.test(
    fieldPath,
  );
}

function skippedRules(reason: string): DateRuleResult[] {
  return [
    'policy_coverage',
    'submission_timing',
    'travel_containment',
    'document_age',
  ].map((ruleId) => ({
    rule_id: ruleId as DateRuleResult['rule_id'],
    status: 'skipped',
    reason,
    evidence: [],
  }));
}

function toEvidence(field: EvidenceRef): EvidenceRef {
  return {
    document_id: field.document_id,
    field_path: field.field_path,
    raw_value: field.raw_value,
    normalized_value: field.normalized_value,
  };
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
