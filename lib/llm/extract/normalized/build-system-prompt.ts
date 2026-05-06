import {
  getNormalizedExtractionFieldSpecs,
  type SupportedMvpExtractionSubtype,
} from '@/lib/extraction-contracts';

export function buildExtractionSystemPrompt(
  subtype: SupportedMvpExtractionSubtype,
): string {
  const { required, optional } = getNormalizedExtractionFieldSpecs(subtype);
  const requiredLines = Object.entries(required).map(
    ([field, spec]) =>
      `- ${field}: ${spec.type}; allow not_present: ${spec.allowNotPresent}`,
  );
  const optionalLines =
    optional.length > 0 ? optional.map((field) => `- ${field}`) : ['- none'];
  const subtypeGuidance = getSubtypeGuidance(subtype);

  return [
    'You are Spectix document extraction. Return JSON only.',
    'Do not include markdown, comments, prose, or copied secrets.',
    'Extract only facts visible in the provided document.',
    `Normalized subtype: ${subtype}`,
    '',
    'Return this exact JSON shape:',
    '{',
    '  "confidence": 0.0,',
    '  "normalized_data": {',
    `    "subtype": "${subtype}",`,
    '    "fields": {',
    '      "field_name": { "presence": "present", "value": "...", "confidence": 0.0 }',
    '    }',
    '  },',
    '  "warnings": []',
    '}',
    '',
    'For unavailable fields use {"presence":"not_present","value":null,"confidence":0.0}.',
    'For unreadable fields use {"presence":"unknown","value":null,"confidence":0.0}.',
    'Use ISO-like dates when visible. Use numbers for monetary amounts and confidence.',
    '',
    'Required fields:',
    ...requiredLines,
    '',
    'Optional fields:',
    ...optionalLines,
    '',
    'Subtype-specific guidance:',
    ...subtypeGuidance,
  ].join('\n');
}

function getSubtypeGuidance(subtype: SupportedMvpExtractionSubtype): string[] {
  switch (subtype) {
    case 'police_report':
      return [
        '- Put any visible report date, filing date, police report date, document date, or incident report date in report_or_filing_date.',
        '- If the document has no separate report/filing date and is clearly a report about one incident, use the incident date as report_or_filing_date and keep incident_date separately if present.',
        '- Do not invent report_or_filing_date when no date evidence is visible.',
      ];
    case 'boarding_pass':
      return [
        '- Put the visible flight date, departure date, boarding date, travel date, or date part of departure/boarding datetime in flight_date.',
        '- If only a time is visible without a date, flight_date is not present.',
        '- Support Hebrew/English labels, OCR-style layouts, and airline terminology variations. Do not invent flight_date when no date evidence is visible.',
      ];
    default:
      return ['- No additional subtype-specific rules.'];
  }
}
