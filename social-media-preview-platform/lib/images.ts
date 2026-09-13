// Server-side image verification (Development Document §6.2: do not trust the
// client-provided MIME type or extension alone). We sniff magic bytes for the
// three supported formats before anything is stored.

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];

export function sniffImageType(buffer: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (PNG.every((b, i) => buffer[i] === b)) return 'image/png';
  if (JPEG.every((b, i) => buffer[i] === b)) return 'image/jpeg';
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50 // WEBP
  ) {
    return 'image/webp';
  }
  return null;
}

export function safeExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}
