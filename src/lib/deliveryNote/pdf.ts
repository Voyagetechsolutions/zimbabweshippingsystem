// Turning the rendered note into a file.
//
// The note is a single page by design: a two-item note and a nine-item note
// both have to come out as one clean sheet, so a tall note is scaled down to
// fit A4 rather than being split across pages mid-manifest.

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 8;

async function capture(element: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/** Places the captured note on one A4 page, scaled to fit if it runs long. */
async function toPdf(element: HTMLElement) {
  const { jsPDF } = await import('jspdf');
  const canvas = await capture(element);
  const pdf = new jsPDF('p', 'mm', 'a4');

  const usableWidth = A4_WIDTH_MM - MARGIN_MM * 2;
  const usableHeight = A4_HEIGHT_MM - MARGIN_MM * 2;

  let width = usableWidth;
  let height = (canvas.height * width) / canvas.width;
  if (height > usableHeight) {
    height = usableHeight;
    width = (canvas.width * height) / canvas.height;
  }

  const x = (A4_WIDTH_MM - width) / 2;
  // JPEG rather than PNG: a lossless capture of this page runs to several
  // megabytes, which is a poor thing to send an operator on a phone. At 0.95 on
  // black-on-white text the difference is not visible in print.
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, MARGIN_MM, width, height);
  return pdf;
}

export async function downloadNotePdf(element: HTMLElement, filename: string): Promise<void> {
  const pdf = await toPdf(element);
  pdf.save(filename);
}

export async function noteToPdfBlob(element: HTMLElement): Promise<Blob> {
  const pdf = await toPdf(element);
  return pdf.output('blob');
}

/**
 * Opens the note in a print window. The markup carries its own inline styles
 * and an inlined logo, so nothing here depends on the app's stylesheet or on a
 * relative asset path resolving.
 */
export function printNote(element: HTMLElement, title: string): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(
    `<html><head><title>${title}</title>` +
    '<style>body{margin:0;padding:0;}@media print{body{margin:0;}@page{size:A4;margin:8mm;}}</style>' +
    `</head><body>${element.outerHTML}</body></html>`,
  );
  win.document.close();
  win.focus();
  // Give the inlined logo a tick to decode before the print dialog snapshots.
  win.setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}
