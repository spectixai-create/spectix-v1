import Anthropic from '@anthropic-ai/sdk';
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

export const DEFAULT_MODEL = 'claude-sonnet-4-6-20250915';

// Pricing per million tokens.
// Source: https://www.anthropic.com/pricing
// Verified by Codex at 2026-05-03. TECH_DEBT 11h tracks moving this to config.
const PRICING: Record<string, { input: number; output: number }> = {
  [DEFAULT_MODEL]: { input: 3, output: 15 },
};

export type ClaudeJSONInput = {
  system: string;
  contentBlocks: BetaContentBlockParam[];
  maxTokens: number;
  model?: string;
};

export type ClaudeJSONResult<T> = {
  parsed: T | null;
  parseError: string | null;
  rawText: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export async function callClaudeJSON<T>({
  system,
  contentBlocks,
  maxTokens,
  model = DEFAULT_MODEL,
}: ClaudeJSONInput): Promise<ClaudeJSONResult<T>> {
  const client = createAnthropicClient();
  const message = await client.beta.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: contentBlocks }],
  });
  const rawText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;

  try {
    return {
      parsed: JSON.parse(rawText) as T,
      parseError: null,
      rawText,
      modelId: message.model,
      inputTokens,
      outputTokens,
      costUsd: calculateCostUsd(model, inputTokens, outputTokens),
    };
  } catch (error) {
    return {
      parsed: null,
      parseError: error instanceof Error ? error.message : String(error),
      rawText,
      modelId: message.model,
      inputTokens,
      outputTokens,
      costUsd: calculateCostUsd(model, inputTokens, outputTokens),
    };
  }
}

export function calculateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING[model] ?? PRICING[DEFAULT_MODEL];

  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

function createAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
