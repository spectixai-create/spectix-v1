const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

export const DOCUMENT_UPLOAD_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/heic,image/heif,.heic,.heif';

export function isHeicFile(file: Pick<File, 'name' | 'type'>): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return (
    HEIC_MIME_TYPES.has(type) ||
    Array.from(HEIC_EXTENSIONS).some((extension) => name.endsWith(extension))
  );
}

export function toJpegFileName(fileName: string): string {
  if (/\.(heic|heif)$/i.test(fileName)) {
    return fileName.replace(/\.(heic|heif)$/i, '.jpg');
  }

  return `${fileName}.jpg`;
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });
  const blob = Array.isArray(result) ? result[0] : result;

  return new File([blob], toJpegFileName(file.name), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}
