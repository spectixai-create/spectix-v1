export type ClipboardLike = {
  writeText: (text: string) => Promise<void>;
};

export type CopyTextResult = 'copied' | 'manual';

export async function copyTextWithClipboard(
  text: string,
  clipboard: ClipboardLike | null | undefined = getBrowserClipboard(),
): Promise<CopyTextResult> {
  if (!clipboard?.writeText) return 'manual';

  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}

function getBrowserClipboard(): ClipboardLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.clipboard;
}
