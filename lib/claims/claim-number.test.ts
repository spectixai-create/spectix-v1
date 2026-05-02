import { describe, expect, it } from 'vitest';

import { parseClaimNumber } from './claim-number';

describe('claim number parsing', () => {
  it('parses YYYY-NNN claim numbers', () => {
    expect(parseClaimNumber('2025-001')).toEqual({ year: 2025, sequence: 1 });
  });

  it('rejects invalid format', () => {
    expect(parseClaimNumber('invalid')).toBeNull();
  });

  it('requires 3 digit sequence', () => {
    expect(parseClaimNumber('2025-1')).toBeNull();
  });

  it('requires 4 digit year', () => {
    expect(parseClaimNumber('25-001')).toBeNull();
  });

  it('round-trips parsed values', () => {
    const parsed = parseClaimNumber('2025-042');

    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(`${parsed.year}-${String(parsed.sequence).padStart(3, '0')}`).toBe(
        '2025-042',
      );
    }
  });
});
