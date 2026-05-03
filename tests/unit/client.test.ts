import { describe, expect, it } from 'vitest';

import { parseClaudeJSON } from '@/lib/llm/client';

describe('parseClaudeJSON', () => {
  it('parses fenced JSON with language tag', () => {
    const result = parseClaudeJSON<{ a: number }>('```json\n{"a":1}\n```');

    expect(result).toEqual({ parsed: { a: 1 }, error: null });
  });

  it('parses fenced JSON without language tag', () => {
    const result = parseClaudeJSON<{ a: number }>('```\n{"a":1}\n```');

    expect(result).toEqual({ parsed: { a: 1 }, error: null });
  });

  it('extracts JSON object from preamble and postamble', () => {
    const result = parseClaudeJSON<{ a: number }>(
      'Here is the JSON:\n```json\n{"a":1}\n```\nHope this helps',
    );

    expect(result).toEqual({ parsed: { a: 1 }, error: null });
  });

  it('parses plain JSON', () => {
    const result = parseClaudeJSON<{ a: number }>('{"a":1}');

    expect(result).toEqual({ parsed: { a: 1 }, error: null });
  });

  it('reports when no JSON object or array exists', () => {
    const result = parseClaudeJSON('not json at all');

    expect(result.parsed).toBeNull();
    expect(result.error).toContain('No JSON');
  });

  it('reports when cleanup still leaves invalid JSON', () => {
    const result = parseClaudeJSON('```json\n{invalid json}\n```');

    expect(result.parsed).toBeNull();
    expect(result.error).toContain('JSON parse failed');
  });
});
