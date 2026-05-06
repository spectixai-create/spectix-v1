import type { ExchangeRateProvider } from './exchange-rate-provider';

export class FetchExchangeRateProvider implements ExchangeRateProvider {
  private readonly cache = new Map<string, number | null>();

  async getRate(
    date: string,
    from: string,
    to: string,
  ): Promise<number | null> {
    const source = from.toUpperCase();
    const target = to.toUpperCase();
    if (source === target) return 1;

    const key = `${date}:${source}:${target}`;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    const url = new URL(`https://api.frankfurter.app/${date}`);
    url.searchParams.set('from', source);
    url.searchParams.set('to', target);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.cache.set(key, null);
        return null;
      }

      const body = (await response.json()) as {
        rates?: Record<string, number>;
      };
      const rate = body.rates?.[target] ?? null;
      this.cache.set(key, typeof rate === 'number' ? rate : null);
      return this.cache.get(key) ?? null;
    } catch {
      this.cache.set(key, null);
      return null;
    }
  }
}
