import { NextResponse } from 'next/server';

import { jsonOk, requireApiUser } from '@/lib/adjuster/api';
import { fetchClaimsList } from '@/lib/adjuster/data';
import type { ClaimListQuery } from '@/lib/adjuster/types';
import { generateClaimNumber } from '@/lib/claims/claim-number';
import {
  createClaimRequestSchema,
  type CreateClaimInput,
} from '@/lib/schemas/claim';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResult, Claim } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ClaimResponse = ApiResult<{ claim: Claim; warnings?: string[] }>;

type DbClaimRow = {
  id: string;
  claim_number: string;
  status: Claim['status'];
  risk_band: Claim['riskBand'];
  risk_score: number | string | null;
  claim_type: Claim['claimType'];
  insured_name: string | null;
  claimant_name: string | null;
  incident_date: string | null;
  incident_location: string | null;
  amount_claimed: number | string | null;
  currency: string;
  summary: string | null;
  metadata: Claim['metadata'];
  claimant_email: string | null;
  claimant_phone: string | null;
  policy_number: string | null;
  current_pass: number | string | null;
  total_llm_cost_usd: number | string | null;
  brief_text: string | null;
  brief_pass_number: number | null;
  brief_recommendation: Claim['briefRecommendation'];
  brief_generated_at: string | null;
  escalated_to_investigator?: boolean | null;
  created_at: string;
  updated_at: string;
};

let claimCreationQueue: Promise<void> = Promise.resolve();

export async function GET(request: Request): Promise<NextResponse> {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 25);
  const data = await fetchClaimsList({
    status: (searchParams.get('status') || 'all') as ClaimListQuery['status'],
    sort: (searchParams.get('sort') || 'newest') as ClaimListQuery['sort'],
    search: searchParams.get('search') ?? undefined,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
  });

  return jsonOk(data);
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 'Request body is not valid JSON', 400);
  }

  const parsed = createClaimRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Validation failed',
          details: { issues: parsed.error.issues },
        },
      },
      { status: 400 },
    );
  }

  const queuedResult = claimCreationQueue.then(() => createClaim(parsed.data));
  claimCreationQueue = queuedResult.then(
    () => undefined,
    () => undefined,
  );

  return queuedResult;
}

async function createClaim(input: CreateClaimInput): Promise<NextResponse> {
  const supabase = createAdminClient();
  let claimNumber: string;

  try {
    claimNumber = await generateClaimNumber();
  } catch (error) {
    console.error('[claim-number-generation-failed]', error);

    return jsonError(
      'claim_number_generation_failed',
      'Failed to generate claim number',
      500,
    );
  }

  const { data, error } = await supabase
    .from('claims')
    .insert({
      claim_number: claimNumber,
      claimant_name: input.claimantName,
      insured_name: input.insuredName,
      claimant_email: input.claimantEmail,
      claimant_phone: input.claimantPhone,
      policy_number: input.policyNumber,
      claim_type: input.claimType,
      incident_date: input.incidentDate,
      incident_location: input.incidentLocation,
      amount_claimed: input.amountClaimed,
      currency: input.currency,
      summary: input.summary,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.error('[claim-number-collision]', { claimNumber });

      return jsonError(
        'claim_number_collision',
        'Claim number collision; retry the request',
        409,
      );
    }

    console.error('[db-insert-failed]', error);

    return jsonError('db_error', 'Database error', 500);
  }

  if (!data) {
    return jsonError('db_error', 'No row returned', 500);
  }

  const claim = mapDbRowToClaim(data as DbClaimRow);
  const warnings: string[] = [];
  const { error: auditError } = await supabase.from('audit_log').insert({
    claim_id: claim.id,
    actor_type: 'system',
    actor_id: null,
    action: 'claim_created',
    target_table: 'claims',
    target_id: claim.id,
    details: { source: 'intake_form' },
  });

  if (auditError) {
    console.error('[audit-failure]', auditError);
    warnings.push('audit_log_failed');
  }

  return NextResponse.json(
    {
      ok: true,
      data: warnings.length > 0 ? { claim, warnings } : { claim },
    } satisfies ClaimResponse,
    { status: 201 },
  );
}

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiResult<never>> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

function mapDbRowToClaim(row: DbClaimRow): Claim {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    status: row.status,
    riskBand: row.risk_band ?? null,
    riskScore: toNullableNumber(row.risk_score),
    claimType: row.claim_type,
    insuredName: row.insured_name,
    claimantName: row.claimant_name,
    incidentDate: row.incident_date,
    incidentLocation: row.incident_location,
    amountClaimed: toNullableNumber(row.amount_claimed),
    currency: row.currency,
    summary: row.summary,
    metadata: row.metadata ?? null,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone,
    policyNumber: row.policy_number,
    currentPass: Number(row.current_pass ?? 0),
    totalLlmCostUsd: Number(row.total_llm_cost_usd ?? 0),
    briefText: row.brief_text,
    briefPassNumber: row.brief_pass_number,
    briefRecommendation: row.brief_recommendation ?? null,
    briefGeneratedAt: row.brief_generated_at,
    escalatedToInvestigator: row.escalated_to_investigator ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}
