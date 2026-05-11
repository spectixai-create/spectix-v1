export type IntakeDemoState = 'success' | 'error';

export type IntakeFormStatus = 'idle' | 'submitting' | 'success' | 'error';

export type TheftTriState = 'yes' | 'no' | 'unknown';

export type TheftDetailsFormValues = {
  bagLocationAtTheft:
    | 'on_body'
    | 'near_customer'
    | 'hotel_room'
    | 'locked_vehicle'
    | 'unlocked_vehicle'
    | 'public_transport'
    | 'restaurant'
    | 'unknown'
    | 'other';
  wasBagSupervised: TheftTriState;
  wasForcedEntry: TheftTriState;
  policeReportFiled: TheftTriState;
  policeReportAvailable: TheftTriState;
  stolenValuables: TheftTriState;
  stolenElectronics: TheftTriState;
  stolenCash: TheftTriState;
  compensationFromOtherSource: TheftTriState;
  theftDescription: string;
};

export type StolenItemFormValues = {
  name: string;
  category:
    | 'bag'
    | 'clothing'
    | 'electronics'
    | 'jewelry'
    | 'cash'
    | 'documents'
    | 'other';
  claimedAmount: string;
  currency: 'ILS' | 'USD' | 'EUR' | 'GBP' | 'OTHER';
  purchaseYear: string;
  hasReceipt: TheftTriState;
  hasProofOfOwnership: TheftTriState;
  isValuable: TheftTriState;
  notes: string;
};

export type IntakeFormValues = {
  fullName: string;
  email: string;
  phone: string;
  policyNumber: string;
  occupation: string;
  tripStartDate: string;
  tripEndDate: string;
  preTripInsurance: '' | 'yes' | 'no' | 'unknown';
  claimType: string;
  incidentDate: string;
  country: string;
  otherCountry: string;
  city: string;
  amountClaimed: string;
  currencyCode: string;
  incidentDescription: string;
  tripPurpose: string;
  localConnections: string;
  previousTripsCount: number | string;
  previousClaimsCount: number | string;
  theftDetails: TheftDetailsFormValues;
  stolenItems: StolenItemFormValues[];
  tosAccepted: boolean;
};

export type MockUploadedFile = {
  id: string;
  name: string;
  sizeBytes: number;
  type: string;
};

export const defaultIntakeValues: IntakeFormValues = {
  fullName: '',
  email: '',
  phone: '',
  policyNumber: '',
  occupation: '',
  tripStartDate: '',
  tripEndDate: '',
  preTripInsurance: '',
  claimType: '',
  incidentDate: '',
  country: '',
  otherCountry: '',
  city: '',
  amountClaimed: '',
  currencyCode: 'ILS',
  incidentDescription: '',
  tripPurpose: '',
  localConnections: '',
  previousTripsCount: '',
  previousClaimsCount: '',
  theftDetails: {
    bagLocationAtTheft: 'unknown',
    wasBagSupervised: 'unknown',
    wasForcedEntry: 'unknown',
    policeReportFiled: 'unknown',
    policeReportAvailable: 'unknown',
    stolenValuables: 'unknown',
    stolenElectronics: 'unknown',
    stolenCash: 'unknown',
    compensationFromOtherSource: 'unknown',
    theftDescription: '',
  },
  stolenItems: [],
  tosAccepted: false,
};

export function createDefaultStolenItem(): StolenItemFormValues {
  return {
    name: '',
    category: 'other',
    claimedAmount: '',
    currency: 'ILS',
    purchaseYear: '',
    hasReceipt: 'unknown',
    hasProofOfOwnership: 'unknown',
    isValuable: 'unknown',
    notes: '',
  };
}
