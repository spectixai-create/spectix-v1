import { ClaimantResponseForm } from './_components/claimant-response-form';
import { ClaimantStatePage } from './_components/state-page';

import { fetchClaimantPortalSnapshot } from '@/lib/claimant/portal';

export const dynamic = 'force-dynamic';

export default async function ClaimantResponsePage({
  params,
  searchParams,
}: {
  params: { claim_id: string };
  searchParams: { token?: string };
}) {
  const token =
    typeof searchParams.token === 'string' ? searchParams.token : null;
  const snapshot = await fetchClaimantPortalSnapshot({
    claimId: params.claim_id,
    token,
  });

  if (snapshot.state !== 'valid') {
    return <ClaimantStatePage state={snapshot.state} />;
  }

  return <ClaimantResponseForm snapshot={snapshot} token={token ?? ''} />;
}
