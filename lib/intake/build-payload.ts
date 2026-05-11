import type { IntakeFormValues } from '../../components/intake/types';
import { countryOptions } from '../sample-data/intake-options';
import type { CreateClaimInput } from '../schemas/claim';
import type { StolenItem, TheftDetails } from '@/lib/theft/metadata';

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
  const currencyCode = values.currencyCode as CreateClaimInput['currency'];

  const theftMetadata =
    values.claimType === 'theft' ? buildTheftMetadata(values) : {};

  return {
    claimantName: values.fullName.trim(),
    insuredName: values.fullName.trim(),
    claimantEmail: optionalString(values.email),
    claimantPhone: optionalString(values.phone),
    policyNumber: optionalString(values.policyNumber),
    claimType: values.claimType as CreateClaimInput['claimType'],
    incidentDate: values.incidentDate,
    tripStartDate: values.tripStartDate,
    tripEndDate: values.tripEndDate,
    preTripInsurance:
      values.preTripInsurance as CreateClaimInput['preTripInsurance'],
    incidentLocation,
    amountClaimed,
    currency: currencyCode,
    currencyCode,
    summary: values.incidentDescription.trim(),
    tosAccepted: values.tosAccepted,
    privacyAccepted: values.tosAccepted,
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
      ...theftMetadata,
    },
  };
}

function buildTheftMetadata(values: IntakeFormValues): {
  theft_details: TheftDetails;
  stolen_items: StolenItem[];
} {
  return {
    theft_details: {
      bag_location_at_theft: values.theftDetails.bagLocationAtTheft,
      was_bag_supervised: values.theftDetails.wasBagSupervised,
      was_forced_entry: values.theftDetails.wasForcedEntry,
      police_report_filed: values.theftDetails.policeReportFiled,
      police_report_available: values.theftDetails.policeReportAvailable,
      stolen_valuables: values.theftDetails.stolenValuables,
      stolen_electronics: values.theftDetails.stolenElectronics,
      stolen_cash: values.theftDetails.stolenCash,
      compensation_from_other_source:
        values.theftDetails.compensationFromOtherSource,
      theft_description: optionalString(values.theftDetails.theftDescription),
    },
    stolen_items: values.stolenItems
      .map((item) => ({
        name: optionalString(item.name),
        category: item.category,
        claimed_amount: optionalNumber(item.claimedAmount),
        currency: item.currency,
        purchase_year: optionalInteger(item.purchaseYear),
        has_receipt: item.hasReceipt,
        has_proof_of_ownership: item.hasProofOfOwnership,
        is_valuable: item.isValuable,
        notes: optionalString(item.notes),
      }))
      .filter(hasMeaningfulStolenItem),
  };
}

function optionalInteger(value: number | string): number | null {
  const parsed = optionalNumber(value);

  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function hasMeaningfulStolenItem(item: StolenItem): boolean {
  return Boolean(
    item.name ||
    item.claimed_amount !== null ||
    item.purchase_year !== null ||
    item.notes ||
    item.category !== 'other' ||
    item.currency !== 'ILS' ||
    item.has_receipt !== 'unknown' ||
    item.has_proof_of_ownership !== 'unknown' ||
    item.is_valuable !== 'unknown',
  );
}
