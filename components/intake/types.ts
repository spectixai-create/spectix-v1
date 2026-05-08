export type IntakeDemoState = 'success' | 'error';

export type IntakeFormStatus = 'idle' | 'submitting' | 'success' | 'error';

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
  tosAccepted: false,
};
