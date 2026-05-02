import type { IntakeFormValues } from '../../components/intake/types';
import { countryOptions } from '../sample-data/intake-options';
import type { CreateClaimInput } from '../schemas/claim';

function optionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';

  return trimmed.length > 0 ? trimmed : null;
}

function optionalNumber(value: number | string): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

function getCountryLabel(values: IntakeFormValues): string {
  if (values.country === 'other') {
    return values.otherCountry.trim();
  }

  return (
    countryOptions.find((option) => option.value === values.country)?.label ??
    values.country.trim()
  );
}

/**
 * Maps intake form values to the public CreateClaim payload.
 *
 * Empty optional fields become null, Select values are English API values, and
 * incidentLocation is built from the separate city/country form controls.
 */
export function buildClaimPayload(values: IntakeFormValues): CreateClaimInput {
  const city = values.city.trim();
  const country = getCountryLabel(values);
  const incidentLocation = [city, country].filter(Boolean).join(', ');
  const amountClaimed = Number.parseFloat(String(values.amountClaimed));

  return {
    claimantName: values.fullName.trim(),
    insuredName: values.fullName.trim(),
    claimantEmail: optionalString(values.email),
    claimantPhone: optionalString(values.phone),
    policyNumber: optionalString(values.policyNumber),
    claimType: values.claimType as CreateClaimInput['claimType'],
    incidentDate: values.incidentDate,
    incidentLocation,
    amountClaimed,
    currency: 'ILS',
    summary: values.incidentDescription.trim(),
    metadata: {
      tripPurpose:
        values.tripPurpose === ''
          ? null
          : (values.tripPurpose as NonNullable<
              CreateClaimInput['metadata']
            >['tripPurpose']),
      localConnections: optionalString(values.localConnections),
      prevTrips24m: optionalNumber(values.previousTripsCount),
      prevTripsWithClaims: optionalNumber(values.previousClaimsCount),
      profession: optionalString(values.occupation),
      country: optionalString(country),
      city: optionalString(city),
    },
  };
}
