import { describe, expect, it, vi } from 'vitest';

import { copyTextWithClipboard } from '@/lib/ui/clipboard';

describe('manual link clipboard fallback', () => {
  it('reports copied when Clipboard API succeeds', async () => {
    const clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      copyTextWithClipboard('https://example.test/c/1', clipboard),
    ).resolves.toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith(
      'https://example.test/c/1',
    );
  });

  it('falls back to manual copy when Clipboard API is unavailable', async () => {
    await expect(
      copyTextWithClipboard('https://example.test/c/1', undefined),
    ).resolves.toBe('manual');
  });

  it('falls back to manual copy when Clipboard API rejects', async () => {
    const clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('permission denied')),
    };

    await expect(
      copyTextWithClipboard('https://example.test/c/1', clipboard),
    ).resolves.toBe('manual');
  });
});
