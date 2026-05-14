import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import {
  getOptionLabel,
  readTheftMetadata,
  stolenItemCategoryOptions,
  theftBagLocationOptions,
  yesNoUnknownOptions,
} from '@/lib/theft/metadata';
import { getClaimTypeLabel } from '@/lib/ui/strings-he';
import { Card, CardContent } from '@/components/ui/card';

export function IntakeSummaryPanel({
  snapshot,
}: Readonly<{
  snapshot: ClaimDetailSnapshot;
}>) {
  const { claim } = snapshot;
  const { theft_details: theftDetails, stolen_items: stolenItems } =
    readTheftMetadata(claim.metadata);
  const normalizedStolenItems = stolenItems ?? [];
  const stolenItemTotals = calculateTotals(normalizedStolenItems);
  const mismatchNote = getAmountMismatchNote(
    claim.amountClaimed,
    claim.currency,
    stolenItemTotals,
  );

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold">פרטי התביעה שנמסרו בטופס</h2>
          <p className="text-sm text-muted-foreground">
            תצוגה לקריאה בלבד של פרטי הקליטה המקוריים
          </p>
        </div>

        <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <SummaryField
            label="סוג תביעה"
            value={getClaimTypeLabel(claim.claimType)}
          />
          <SummaryField label="תקציר האירוע" value={claim.summary} />
          <SummaryField
            label="תאריך אירוע"
            value={formatDate(claim.incidentDate)}
          />
          <SummaryField label="מיקום האירוע" value={claim.incidentLocation} />
          <SummaryField label="מספר פוליסה" value={claim.policyNumber} />
          <SummaryField
            label="תאריכי נסיעה"
            value={formatTravelDates(claim.tripStartDate, claim.tripEndDate)}
          />
          <SummaryField
            label="סכום תביעה"
            value={formatAmount(claim.amountClaimed, claim.currency)}
          />
          <SummaryField label="מטבע" value={claim.currency} />
        </dl>

        {theftDetails ? (
          <section className="space-y-3">
            <h3 className="font-medium">פרטי הגניבה</h3>
            <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
              <SummaryField
                label="מיקום התיק בזמן הגניבה"
                value={getOptionLabel(
                  theftBagLocationOptions,
                  theftDetails.bag_location_at_theft,
                )}
              />
              <SummaryField
                label="התיק היה תחת השגחה"
                value={yesNoUnknownLabel(theftDetails.was_bag_supervised)}
              />
              <SummaryField
                label="פריצה או סימני פריצה"
                value={yesNoUnknownLabel(theftDetails.was_forced_entry)}
              />
              <SummaryField
                label="הוגשה תלונה במשטרה"
                value={yesNoUnknownLabel(theftDetails.police_report_filed)}
              />
              <SummaryField
                label="יש אישור משטרה"
                value={yesNoUnknownLabel(theftDetails.police_report_available)}
              />
              <SummaryField
                label="נגנבו חפצי ערך"
                value={yesNoUnknownLabel(theftDetails.stolen_valuables)}
              />
              <SummaryField
                label="נגנבו מכשירים אלקטרוניים"
                value={yesNoUnknownLabel(theftDetails.stolen_electronics)}
              />
              <SummaryField
                label="נגנב מזומן"
                value={yesNoUnknownLabel(theftDetails.stolen_cash)}
              />
              <SummaryField
                label="פיצוי מגורם אחר"
                value={yesNoUnknownLabel(
                  theftDetails.compensation_from_other_source,
                )}
              />
              <SummaryField
                label="תיאור נסיבות הגניבה"
                value={theftDetails.theft_description}
                className="md:col-span-2 xl:col-span-3"
              />
            </dl>
          </section>
        ) : null}

        {normalizedStolenItems.length > 0 ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">פריטים שנגנבו</h3>
              <div className="text-sm text-muted-foreground">
                סך הכל פריטים: {formatTotals(stolenItemTotals)}
              </div>
            </div>
            {mismatchNote ? (
              <p className="rounded-md border border-risk-orange bg-risk-orange-bg px-3 py-2 text-sm">
                {mismatchNote}
              </p>
            ) : null}
            <div className="grid gap-3">
              {normalizedStolenItems.map((item, index) => (
                <div
                  key={`${item.name ?? 'item'}-${index}`}
                  className="rounded-md border p-3"
                >
                  <div className="mb-2 font-medium">
                    {item.name || `פריט ${index + 1}`}
                  </div>
                  <dl className="grid gap-2 text-sm md:grid-cols-3">
                    <SummaryField
                      label="קטגוריה"
                      value={getOptionLabel(
                        stolenItemCategoryOptions,
                        item.category,
                      )}
                    />
                    <SummaryField
                      label="סכום"
                      value={formatAmount(item.claimed_amount, item.currency)}
                    />
                    <SummaryField
                      label="מטבע"
                      value={item.currency ?? 'לא צוין'}
                    />
                    <SummaryField
                      label="יש קבלה"
                      value={yesNoUnknownLabel(item.has_receipt)}
                    />
                    <SummaryField
                      label="יש הוכחת בעלות"
                      value={yesNoUnknownLabel(item.has_proof_of_ownership)}
                    />
                    <SummaryField
                      label="חפץ ערך"
                      value={yesNoUnknownLabel(item.is_valuable)}
                    />
                  </dl>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryField({
  label,
  value,
  className,
}: Readonly<{
  label: string;
  value: string | number | null | undefined;
  className?: string;
}>) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value || 'לא צוין'}</dd>
    </div>
  );
}

function yesNoUnknownLabel(value: string | null | undefined): string {
  return getOptionLabel(yesNoUnknownOptions, value);
}

function formatDate(value: string | null): string {
  if (!value) return 'לא צוין';
  return new Intl.DateTimeFormat('he-IL').format(new Date(value));
}

function formatTravelDates(
  startDate: string | null,
  endDate: string | null,
): string {
  if (!startDate && !endDate) return 'לא צוין';
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (!amount) return 'לא צוין';
  return `${amount.toLocaleString('he-IL')} ${currency ?? ''}`.trim();
}

function calculateTotals(
  items: Array<{ claimed_amount: number | null; currency: string | null }>,
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const item of items) {
    if (!item.claimed_amount || item.claimed_amount <= 0) continue;
    const currency = item.currency ?? 'ILS';
    totals.set(currency, (totals.get(currency) ?? 0) + item.claimed_amount);
  }

  return totals;
}

function formatTotals(totals: Map<string, number>): string {
  if (totals.size === 0) return 'לא צוין';
  return Array.from(totals.entries())
    .map(([currency, amount]) => formatAmount(amount, currency))
    .join(' / ');
}

function getAmountMismatchNote(
  claimAmount: number | null,
  claimCurrency: string,
  totals: Map<string, number>,
): string | null {
  if (!claimAmount || claimAmount <= 0) return null;
  const itemTotal = totals.get(claimCurrency);
  if (!itemTotal || itemTotal <= 0) return null;

  const absoluteDifference = Math.abs(claimAmount - itemTotal);
  const relativeDifference =
    absoluteDifference / Math.max(claimAmount, itemTotal);

  if (absoluteDifference <= 100 && relativeDifference <= 0.05) return null;

  return `קיים פער בין סכום התביעה (${formatAmount(
    claimAmount,
    claimCurrency,
  )}) לבין סכום הפריטים (${formatAmount(itemTotal, claimCurrency)}).`;
}
