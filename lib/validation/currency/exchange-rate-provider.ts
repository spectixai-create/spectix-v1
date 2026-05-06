export interface ExchangeRateProvider {
  getRate(date: string, from: string, to: string): Promise<number | null>;
}
