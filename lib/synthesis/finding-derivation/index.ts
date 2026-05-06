import type { ValidationLayerId } from '@/lib/validation';

import { deriveCurrencyFindings } from './layer-11-3-currency';
import { deriveDateFindings } from './layer-11-2-dates';
import { deriveNameFindings } from './layer-11-1-name';
import { missingLayerFinding } from './missing-layer';
import type { ClaimValidationRow, Finding } from '../types';

const EXPECTED_LAYERS: ValidationLayerId[] = ['11.1', '11.2', '11.3'];

export function deriveFindingsFromValidations(
  rows: ClaimValidationRow[],
): Finding[] {
  const byLayer = new Map<ValidationLayerId, ClaimValidationRow>();
  for (const row of rows) byLayer.set(row.layer_id, row);

  const findings: Finding[] = [];
  for (const layerId of EXPECTED_LAYERS) {
    const row = byLayer.get(layerId);
    if (!row) {
      findings.push(missingLayerFinding(layerId));
      continue;
    }

    if (layerId === '11.1') findings.push(...deriveNameFindings(row));
    if (layerId === '11.2') findings.push(...deriveDateFindings(row));
    if (layerId === '11.3') findings.push(...deriveCurrencyFindings(row));
  }

  return findings;
}
