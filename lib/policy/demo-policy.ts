export type TravelPolicy = {
  policy_number: string;
  aliases?: string[];
  insured_name: string;
  coverage_start: string;
  coverage_end: string;
  destinations: string[];
  coverages: {
    baggage: {
      covered: boolean;
      limit_total: number;
      limit_per_item: number;
      deductible: number;
    };
    valuables: {
      covered: boolean;
      requires_receipt: boolean;
      limit_per_item: number;
    };
    cash: {
      covered: boolean;
      limit?: number;
    };
    electronics: {
      covered: boolean;
      requires_receipt: boolean;
      limit_per_item: number;
    };
  };
  required_documents: {
    theft: Array<
      'police_report' | 'item_list' | 'proof_of_ownership' | 'travel_dates'
    >;
  };
  exclusions: Array<
    | 'unattended_baggage'
    | 'theft_from_unlocked_vehicle'
    | 'cash'
    | 'items_without_proof_above_threshold'
  >;
};

export const DEMO_TRAVEL_POLICY: TravelPolicy = {
  policy_number: 'DEMO-POLICY-TRAVEL-001',
  aliases: ['DEMO-TRAVEL-001', 'POL-DEMO-001'],
  insured_name: 'Demo Traveller',
  coverage_start: '2026-05-01',
  coverage_end: '2026-05-31',
  destinations: ['France', 'FR', 'צרפת', 'Paris', 'פריז'],
  coverages: {
    baggage: {
      covered: true,
      limit_total: 5000,
      limit_per_item: 2000,
      deductible: 100,
    },
    valuables: {
      covered: true,
      requires_receipt: true,
      limit_per_item: 1500,
    },
    cash: {
      covered: false,
    },
    electronics: {
      covered: true,
      requires_receipt: true,
      limit_per_item: 2500,
    },
  },
  required_documents: {
    theft: ['police_report', 'item_list', 'proof_of_ownership', 'travel_dates'],
  },
  exclusions: [
    'unattended_baggage',
    'theft_from_unlocked_vehicle',
    'cash',
    'items_without_proof_above_threshold',
  ],
};

export const DEMO_TRAVEL_ITALY_POLICY: TravelPolicy = {
  ...DEMO_TRAVEL_POLICY,
  policy_number: 'DEMO-POLICY-TRAVEL-ITALY-001',
  aliases: ['16165132165'],
  insured_name: 'Demo Italy Traveller',
  destinations: ['Italy', 'IT', 'איטליה', 'Rome', 'רומא', 'Milan', 'מילאנו'],
};

const DEMO_POLICIES = [DEMO_TRAVEL_POLICY, DEMO_TRAVEL_ITALY_POLICY];

export function resolveDemoPolicy(
  policyNumber: string | null | undefined,
): TravelPolicy | null {
  const normalizedPolicyNumber = policyNumber?.trim();

  if (!normalizedPolicyNumber) {
    return null;
  }

  return (
    DEMO_POLICIES.find(
      (policy) =>
        policy.policy_number === normalizedPolicyNumber ||
        policy.aliases?.includes(normalizedPolicyNumber),
    ) ?? null
  );
}
