export type IntakeDemoState = 'success' | 'error';

export type IntakeFormStatus = 'idle' | 'submitting' | 'success' | 'error';

export type IntakeFormValues = {
  fullName: string;
  email: string;
  phone: string;
  policyNumber: string;
  occupation: string;
  claimType: string;
  incidentDate: string;
  country: string;
  otherCountry: string;
  city: string;
  amountClaimed: string;
  incidentDescription: string;
  tripPurpose: string;
  localConnections: string;
  previousTripsCount: number | string;
  previousClaimsCount: number | string;
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
  claimType: '',
  incidentDate: '',
  country: '',
  otherCountry: '',
  city: '',
  amountClaimed: '',
  incidentDescription: '',
  tripPurpose: '',
  localConnections: '',
  previousTripsCount: '',
  previousClaimsCount: '',
};
