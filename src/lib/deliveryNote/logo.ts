// The logo, as a base64 data URI.
//
// The note is captured by html2canvas and also written into a fresh print
// window, and a relative "/logo.png" resolves against neither reliably. A data
// URI is the only form that survives both, so the file is fetched once, scaled
// down to the size the note actually prints it at, and cached for the session.

const RENDER_WIDTH = 260; // 2x the 130px box, so it stays sharp at scale 2

let cached: Promise<string> | null = null;

async function build(): Promise<string> {
  const response = await fetch('/logo.png');
  if (!response.ok) throw new Error(`logo ${response.status}`);
  const blob = await response.blob();

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, RENDER_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL('image/png');
}

/**
 * Resolves to a data: URI, or to an empty string if the logo cannot be loaded —
 * a missing logo must never stop a delivery note from being issued.
 */
export function loadLogoDataUri(): Promise<string> {
  if (!cached) {
    cached = build().catch((err) => {
      console.warn('Delivery note logo could not be inlined:', err);
      return '';
    });
  }
  return cached;
}
