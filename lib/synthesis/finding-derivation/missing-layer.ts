import { generateFindingId } from '../id-generation';
import type { Finding } from '../types';
import type { ValidationLayerId } from '@/lib/validation';

export function missingLayerFinding(layerId: ValidationLayerId): Finding {
  const seed = {
    category: 'gap',
    severity: 'high',
    title: `שכבה ${layerId} לא רצה`,
    source_layer_id: layerId,
  } as const;

  return {
    id: generateFindingId(seed),
    category: 'gap',
    severity: 'high',
    title: seed.title,
    description: `לא נמצאה תוצאת ולידציה עבור שכבה ${layerId} בפס הוולידציה.`,
    evidence: [],
    source_layer_id: layerId,
  };
}
