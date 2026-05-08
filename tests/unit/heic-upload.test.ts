import { describe, expect, it } from 'vitest';

import { isHeicFile, toJpegFileName } from '@/lib/upload/heic';

describe('HEIC upload helpers', () => {
  it('detects HEIC and HEIF by MIME type or extension', () => {
    expect(
      isHeicFile(new File(['x'], 'photo.jpg', { type: 'image/heic' })),
    ).toBe(true);
    expect(isHeicFile(new File(['x'], 'photo.HEIF', { type: '' }))).toBe(true);
    expect(
      isHeicFile(new File(['x'], 'photo.jpeg', { type: 'image/jpeg' })),
    ).toBe(false);
  });

  it('renames HEIC and HEIF files to JPEG names', () => {
    expect(toJpegFileName('receipt.heic')).toBe('receipt.jpg');
    expect(toJpegFileName('receipt.HEIF')).toBe('receipt.jpg');
    expect(toJpegFileName('receipt')).toBe('receipt.jpg');
  });
});
