import { z } from 'zod';

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
    incidentLocation: z.string().min(1).max(200),
    amountClaimed: z.number().positive().max(10_000_000),
    currency: z.string().length(3).default('ILS'),
    summary: z.string().min(10).max(2000),
    metadata: createClaimMetadataSchema.optional(),
  })
  .strict();

export type CreateClaimInput = z.infer<typeof createClaimRequestSchema>;
