import { z } from 'zod';

import { isCurrencyCode } from '@/lib/intake/currencies';
import {
  validateTripDateContext,
  type PreTripInsurance,
} from '@/lib/intake/trip-validation';

const yesNoUnknownSchema = z.enum(['yes', 'no', 'unknown']);

const theftDetailsSchema = z
  .object({
    bag_location_at_theft: z
      .enum([
        'on_body',
        'near_customer',
        'hotel_room',
        'locked_vehicle',
        'unlocked_vehicle',
        'public_transport',
        'restaurant',
        'unknown',
        'other',
      ])
      .nullable(),
    was_bag_supervised: yesNoUnknownSchema.nullable(),
    was_forced_entry: yesNoUnknownSchema.nullable(),
    police_report_filed: yesNoUnknownSchema.nullable(),
    police_report_available: yesNoUnknownSchema.nullable(),
    stolen_valuables: yesNoUnknownSchema.nullable(),
    stolen_electronics: yesNoUnknownSchema.nullable(),
    stolen_cash: yesNoUnknownSchema.nullable(),
    compensation_from_other_source: yesNoUnknownSchema.nullable(),
    theft_description: z.string().max(1000).nullable(),
  })
  .strict();

const stolenItemSchema = z
  .object({
    name: z.string().max(120).nullable(),
    category: z
      .enum([
        'bag',
        'clothing',
        'electronics',
        'jewelry',
        'cash',
        'documents',
        'other',
      ])
      .nullable(),
    claimed_amount: z.number().nonnegative().max(10_000_000).nullable(),
    currency: z.enum(['ILS', 'USD', 'EUR', 'GBP', 'OTHER']).nullable(),
    purchase_year: z.number().int().min(1900).max(2100).nullable(),
    has_receipt: yesNoUnknownSchema.nullable(),
    has_proof_of_ownership: yesNoUnknownSchema.nullable(),
    is_valuable: yesNoUnknownSchema.nullable(),
    notes: z.string().max(500).nullable(),
  })
  .strict();

/**
 * Validates intake-time metadata fields only.
 * Pipeline-time fields are written by backend pipeline spikes.
 */
export const createClaimMetadataSchema = z
  .object({
    tripPurpose: z
      .enum([
        'tourism',
        'business',
        'family_visit',
        'medical',
        'study',
        'other',
      ])
      .nullish(),
    localConnections: z.string().max(2000).nullish(),
    prevTrips24m: z.number().int().min(0).max(99).nullish(),
    prevTripsWithClaims: z.number().int().min(0).max(99).nullish(),
    profession: z.string().max(100).nullish(),
    country: z.string().max(100).nullish(),
    city: z.string().max(100).nullish(),
    theft_details: theftDetailsSchema.nullish(),
    stolen_items: z.array(stolenItemSchema).max(50).nullish(),
  })
  .strict();

export const createClaimRequestSchema = z
  .object({
    claimantName: z.string().min(1).max(100),
    insuredName: z.string().min(1).max(100),
    claimantEmail: z.string().email().nullish(),
    claimantPhone: z.string().max(50).nullish(),
    policyNumber: z.string().max(100).nullish(),
    claimType: z.enum([
      'theft',
      'loss',
      'medical',
      'flight_cancellation',
      'flight_delay',
      'liability',
      'emergency',
      'misrepresentation',
      'baggage',
      'other',
    ]),
    incidentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
      .refine((dateStr) => {
        const todayInIsrael = new Date().toLocaleDateString('en-CA', {
          timeZone: 'Asia/Jerusalem',
        });

        return dateStr <= todayInIsrael;
      }, 'incidentDate must be on or before today (Asia/Jerusalem)'),
    tripStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'tripStartDate must be YYYY-MM-DD format'),
    tripEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'tripEndDate must be YYYY-MM-DD format'),
    preTripInsurance: z.enum(['yes', 'no', 'unknown']),
    incidentLocation: z.string().min(1).max(200),
    amountClaimed: z.number().positive().max(10_000_000),
    currency: z.string().refine(isCurrencyCode).default('ILS'),
    currencyCode: z.string().refine(isCurrencyCode).optional(),
    summary: z.string().min(10).max(2000),
    tosAccepted: z.boolean().optional(),
    privacyAccepted: z.boolean().optional(),
    tos_accepted: z.boolean().optional(),
    privacy_accepted: z.boolean().optional(),
    metadata: createClaimMetadataSchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.tosAccepted !== true && input.tos_accepted !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tosAccepted'],
        message: 'tos_accepted must be true',
      });
    }

    if (input.privacyAccepted !== true && input.privacy_accepted !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privacyAccepted'],
        message: 'privacy_accepted must be true',
      });
    }

    const tripIssues = validateTripDateContext({
      incidentDate: input.incidentDate,
      tripStartDate: input.tripStartDate,
      tripEndDate: input.tripEndDate,
    });

    for (const [path, message] of Object.entries(tripIssues)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message,
      });
    }
  });

export type CreateClaimInput = z.infer<typeof createClaimRequestSchema>;
export type ClaimPreTripInsurance = PreTripInsurance;
