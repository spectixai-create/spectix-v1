import { z } from 'zod';

import { isCurrencyCode } from '@/lib/intake/currencies';
import {
  validateTripDateContext,
  type PreTripInsurance,
} from '@/lib/intake/trip-validation';

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
