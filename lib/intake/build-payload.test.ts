import { describe, expect, it } from 'vitest';

import {
  defaultIntakeValues,
  type IntakeFormValues,
} from '../../components/intake/types';

import { buildClaimPayload } from './build-payload';

const baseValues: IntakeFormValues = {
  fullName: 'נועה בן דוד',
  email: 'noa@example.com',
  phone: '0501234567',
  policyNumber: 'POL-001',
  occupation: 'מנהלת שיווק',
  tripStartDate: '2025-04-10',
  tripEndDate: '2025-04-20',
  preTripInsurance: 'yes',
  claimType: 'theft',
  incidentDate: '2025-04-15',
  country: 'TH',
  otherCountry: '',
  city: 'בנגקוק',
  amountClaimed: '5000',
  currencyCode: 'THB',
  incidentDescription: 'התיק נגנב בזמן מעבר בין המלון למרכז הקניות.',
  tripPurpose: 'tourism',
  localConnections: 'אין',
  previousTripsCount: '2',
  previousClaimsCount: '1',
  theftDetails: defaultIntakeValues.theftDetails,
  stolenItems: [],
  tosAccepted: true,
};

describe('buildClaimPayload', () => {
  it('maps populated form fields to create claim payload', () => {
    expect(buildClaimPayload(baseValues)).toEqual({
      claimantName: 'נועה בן דוד',
      insuredName: 'נועה בן דוד',
      claimantEmail: 'noa@example.com',
      claimantPhone: '0501234567',
      policyNumber: 'POL-001',
      claimType: 'theft',
      incidentDate: '2025-04-15',
      tripStartDate: '2025-04-10',
      tripEndDate: '2025-04-20',
      preTripInsurance: 'yes',
      incidentLocation: 'בנגקוק, תאילנד',
      amountClaimed: 5000,
      currency: 'THB',
      currencyCode: 'THB',
      summary: 'התיק נגנב בזמן מעבר בין המלון למרכז הקניות.',
      tosAccepted: true,
      privacyAccepted: true,
      metadata: {
        tripPurpose: 'tourism',
        localConnections: 'אין',
        prevTrips24m: 2,
        prevTripsWithClaims: 1,
        profession: 'מנהלת שיווק',
        country: 'תאילנד',
        city: 'בנגקוק',
        theft_details: {
          bag_location_at_theft: 'unknown',
          was_bag_supervised: 'unknown',
          was_forced_entry: 'unknown',
          police_report_filed: 'unknown',
          police_report_available: 'unknown',
          stolen_valuables: 'unknown',
          stolen_electronics: 'unknown',
          stolen_cash: 'unknown',
          compensation_from_other_source: 'unknown',
          theft_description: null,
        },
        stolen_items: [],
      },
    });
  });

  it('maps empty optional fields to null', () => {
    const payload = buildClaimPayload({
      ...baseValues,
      email: '',
      phone: '',
      policyNumber: '',
      occupation: '',
      localConnections: '',
      previousTripsCount: '',
      previousClaimsCount: '',
      tripPurpose: '',
    });

    expect(payload.claimantEmail).toBeNull();
    expect(payload.claimantPhone).toBeNull();
    expect(payload.policyNumber).toBeNull();
    expect(payload.metadata).toMatchObject({
      tripPurpose: null,
      localConnections: null,
      prevTrips24m: null,
      prevTripsWithClaims: null,
      profession: null,
    });
  });

  it('parses amountClaimed as a number', () => {
    expect(buildClaimPayload(baseValues).amountClaimed).toBe(5000);
  });

  it('keeps selected currency code in both API currency fields', () => {
    const payload = buildClaimPayload({ ...baseValues, currencyCode: 'USD' });

    expect(payload.currency).toBe('USD');
    expect(payload.currencyCode).toBe('USD');
  });

  it('builds location from city and custom country', () => {
    const payload = buildClaimPayload({
      ...baseValues,
      country: 'other',
      otherCountry: 'מלטה',
      city: 'ולטה',
    });

    expect(payload.incidentLocation).toBe('ולטה, מלטה');
    expect(payload.metadata?.country).toBe('מלטה');
  });

  it('keeps metadata in the expected sub-object', () => {
    const payload = buildClaimPayload(baseValues);

    expect(payload.metadata).toEqual(
      expect.objectContaining({
        tripPurpose: 'tourism',
        prevTrips24m: 2,
        prevTripsWithClaims: 1,
      }),
    );
  });
});
