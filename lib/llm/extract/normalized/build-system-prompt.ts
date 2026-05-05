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
  ].join('\n');
}
