import { describe, expect, it } from 'vitest';

import { isCurrencyCode } from '@/lib/intake/currencies';
import {
  TRIP_DATE_MESSAGES,
  validateTripDateContext,
} from '@/lib/intake/trip-validation';
import { createClaimRequestSchema } from '@/lib/schemas/claim';

const validPayload = {
  claimantName: 'Test User',
  insuredName: 'Test User',
  claimantEmail: 'test@example.com',
  claimantPhone: '0501234567',
  policyNumber: 'POL-001',
  claimType: 'theft',
  incidentDate: '2025-04-15',
  tripStartDate: '2025-04-10',
  tripEndDate: '2025-04-20',
  preTripInsurance: 'yes',
  incidentLocation: 'Bangkok, Thailand',
  amountClaimed: 5000,
  currency: 'THB',
  currencyCode: 'THB',
  summary: 'Test claim summary, sufficient length to pass validation.',
  tosAccepted: true,
  privacyAccepted: true,
  metadata: { tripPurpose: 'tourism' },
} as const;

describe('UI-003 Part 2 intake validation', () => {
  it('accepts three-letter uppercase currency codes', () => {
    expect(isCurrencyCode('ILS')).toBe(true);
    expect(isCurrencyCode('THB')).toBe(true);
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isCurrencyCode('USDT')).toBe(false);
  });

  it('requires ToS and Privacy acceptance', () => {
    const result = createClaimRequestSchema.safeParse({
      ...validPayload,
      tosAccepted: false,
      privacyAccepted: true,
    });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['tosAccepted'] }),
      ]),
    );
  });

  it('rejects incident dates outside the trip window', () => {
    const result = createClaimRequestSchema.safeParse({
      ...validPayload,
      incidentDate: '2025-04-22',
    });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: TRIP_DATE_MESSAGES.incidentOutsideTrip,
          path: ['incidentDate'],
        }),
      ]),
    );
  });

  it('reports trip end before trip start', () => {
    expect(
      validateTripDateContext({
        incidentDate: '2025-04-15',
        tripStartDate: '2025-04-20',
        tripEndDate: '2025-04-10',
        today: '2025-04-30',
      }),
    ).toMatchObject({
      tripEndDate: TRIP_DATE_MESSAGES.tripEndBeforeStart,
      incidentDate: TRIP_DATE_MESSAGES.incidentOutsideTrip,
    });
  });
});
