import type { ExchangeRateProvider } from './exchange-rate-provider';

const RATES_TO_ILS: Record<string, number> = {
  ILS: 1,
  USD: 3.7,
  EUR: 4,
  GBP: 4.6,
};

export class FakeExchangeRateProvider implements ExchangeRateProvider {
  async getRate(
    _date: string,
    from: string,
    to: string,
  ): Promise<number | null> {
    const source = from.toUpperCase();
    const target = to.toUpperCase();
    if (source === target) return 1;

    const sourceToIls = RATES_TO_ILS[source];
    const targetToIls = RATES_TO_ILS[target];
    if (!sourceToIls || !targetToIls) return null;

    return sourceToIls / targetToIls;
  }
}
