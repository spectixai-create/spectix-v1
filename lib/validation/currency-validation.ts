import {
  getFieldsByKind,
  type collectNormalizedExtractionFields,
} from './normalized-fields';
import { FakeExchangeRateProvider } from './currency/fake-exchange-rate';
import { FetchExchangeRateProvider } from './currency/fetch-exchange-rate';
import type { ExchangeRateProvider } from './currency/exchange-rate-provider';
import type {
  CurrencyItemStatus,
  CurrencyValidationPayload,
  EvidenceRef,
  ValidationClaimContext,
  ValidationLayerResult,
} from './types';

type Collection = ReturnType<typeof collectNormalizedExtractionFields>;

export function getDefaultExchangeRateProvider(): ExchangeRateProvider {
  return process.env.VALIDATION_FX_PROVIDER === 'live'
    ? new FetchExchangeRateProvider()
    : new FakeExchangeRateProvider();
}

export async function runCurrencyValidationLayer({
  collection,
  claim,
  provider = getDefaultExchangeRateProvider(),
  rateDate = new Date().toISOString().slice(0, 10),
}: {
  collection: Collection;
  claim: ValidationClaimContext;
  provider?: ExchangeRateProvider;
  rateDate?: string;
}): Promise<ValidationLayerResult<CurrencyValidationPayload>> {
  const amountFields = getFieldsByKind(collection, 'amount');
  const currencyFields = getFieldsByKind(collection, 'currency');
  const settlementCurrency = (claim.currency ?? 'ILS').toUpperCase();

  if (amountFields.length === 0) {
    return {
      layer_id: '11.3',
      status: 'skipped',
      payload: {
        reason: 'no_amount_fields',
        settlement_currency: settlementCurrency,
        items: [],
        total_normalized: 0,
        summary: {
          total_amount_fields: 0,
          ok: 0,
          rate_failure: 0,
          non_positive_amount: 0,
          outliers: 0,
          skipped_broad_fallback_documents:
            collection.skipped_broad_fallback.length,
        },
      },
    };
  }

  const parsed = amountFields.map((amountField) => {
    const currency =
      findCurrencyForDocument(currencyFields, amountField.document_id) ??
      settlementCurrency;
    return {
      amount: parseAmount(amountField.value),
      currency,
      evidence: [toEvidence(amountField)],
    };
  });
  const positiveAmounts = parsed
    .map((item) => item.amount)
    .filter((amount): amount is number => amount !== null && amount > 0);
  const median = medianOf(positiveAmounts);

  const items: CurrencyValidationPayload['items'] = [];
  for (const item of parsed) {
    const reasons: string[] = [];
    let status: CurrencyItemStatus = 'ok';
    let normalizedAmount: number | null = null;
    let rate: number | null = null;

    if (item.amount === null || item.amount <= 0) {
      status = 'non_positive_amount';
      reasons.push('non_positive_amount');
    } else {
      rate = await provider.getRate(
        rateDate,
        item.currency,
        settlementCurrency,
      );
      if (rate === null) {
        status = 'rate_failure';
        reasons.push('rate_failure');
      } else {
        normalizedAmount = roundMoney(item.amount * rate);
      }
    }

    if (
      normalizedAmount !== null &&
      median !== null &&
      (normalizedAmount > median * 10 ||
        zScore(normalizedAmount, positiveAmounts) > 3)
    ) {
      status = 'outlier';
      reasons.push('outlier');
    }

    items.push({
      amount: item.amount ?? 0,
      currency: item.currency,
      normalized_amount: normalizedAmount,
      rate,
      status,
      reasons,
      evidence: item.evidence,
    });
  }

  return {
    layer_id: '11.3',
    status: 'completed',
    payload: {
      settlement_currency: settlementCurrency,
      items,
      total_normalized: roundMoney(
        items
          .filter((item) => item.status === 'ok' || item.status === 'outlier')
          .reduce((sum, item) => sum + (item.normalized_amount ?? 0), 0),
      ),
      summary: {
        total_amount_fields: amountFields.length,
        ok: items.filter((item) => item.status === 'ok').length,
        rate_failure: items.filter((item) => item.status === 'rate_failure')
          .length,
        non_positive_amount: items.filter(
          (item) => item.status === 'non_positive_amount',
        ).length,
        outliers: items.filter((item) => item.status === 'outlier').length,
        skipped_broad_fallback_documents:
          collection.skipped_broad_fallback.length,
      },
    },
  };
}

export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/[₪$€£]/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function findCurrencyForDocument(
  currencyFields: ReturnType<typeof getFieldsByKind>,
  documentId: string,
): string | null {
  const field = currencyFields.find(
    (candidate) => candidate.document_id === documentId,
  );
  return field ? String(field.value).toUpperCase() : null;
}

function toEvidence(field: EvidenceRef): EvidenceRef {
  return {
    document_id: field.document_id,
    field_path: field.field_path,
    raw_value: field.raw_value,
    normalized_value: field.normalized_value,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function zScore(value: number, values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, item) => sum + item, 0) / values.length;
  const variance =
    values.reduce((sum, item) => sum + (item - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return Math.abs((value - mean) / std);
}
