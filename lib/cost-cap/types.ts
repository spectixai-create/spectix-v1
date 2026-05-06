import { NonRetriableError } from 'inngest';

export const COST_CAP_USD = 2.0;

export class CostCapHaltError extends NonRetriableError {
  constructor(message = 'Claim LLM cost cap reached') {
    super(message);
    this.name = 'CostCapHaltError';
  }
}
