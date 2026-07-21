import { Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

// Server-side report aggregation (admin_reports RPC) shared by the Reports and
// Analytics screens, plus CSV/PDF export helpers.

export type RangeKey = 'today' | 'week' | 'month' | 'last30' | 'custom';

export type ReportFilters = {
  country?: string; route?: string; driver?: string; status?: string; currency?: string;
};

export type AdminReport = {
  range: { from: string; to: string; days: number };
  revenue: {
    byCurrency: Record<string, number>;
    prevByCurrency: Record<string, number>;
    series: Array<{ day: string; gbp: number | null; eur: number | null }>;
    byRoute: Array<{ route: string; currency: string; total: number }>;
    byMethod: Array<{ method: string; currency: string; total: number }>;
  };
  shipments: {
    total: number; prevTotal: number;
    series: Array<{ day: string; count: number }>;
    byStatus: Record<string, number>;
    byRoute: Array<{ route: string; count: number }>;
  };
  collections: { completed: number; failed: number; byRoute: Array<{ route: string; done: number; failed: number }> };
  deliveries: { completed: number; failed: number; successRate: number | null };
  driverPerformance: Array<{ driverId: string; name: string; completed: number; failed: number }>;
  failReasons: Record<string, number>;
  quotes: { requested: number; approved: number; booked: number };
  customers: { new: number; returning: number; series: Array<{ day: string; count: number }> };
  proofs: { pending: number; verified: number; rejected: number; avgValidationHours: number | null };
  outstanding: { byCurrency: Record<string, number>; invoices: number };
};

function iso(d: Date) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function rangeFor(key: RangeKey, custom?: { from: string; to: string }): { from: string; to: string } {
  const today = new Date();
  if (key === 'custom' && custom) return custom;
  if (key === 'today') return { from: iso(today), to: iso(today) };
  if (key === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: iso(start), to: iso(today) };
  }
  if (key === 'month') {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  }
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  return { from: iso(start), to: iso(today) };
}

export async function fetchAdminReport(from: string, to: string, filters: ReportFilters = {}): Promise<AdminReport> {
  const { data, error } = await supabase.rpc('admin_reports', {
    p_from: from, p_to: to,
    p_filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  });
  if (error) throw error;
  return data as AdminReport;
}

export function sym(currency: string) {
  return currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
}

export function currencyLine(map: Record<string, number> | undefined): string {
  const entries = Object.entries(map || {}).filter(([, v]) => Number(v) !== 0);
  if (!entries.length) return '£0.00';
  return entries.sort(([a], [b]) => a.localeCompare(b))
    .map(([c, v]) => `${sym(c)}${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .join(' · ');
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous && !current) return null;
  if (!previous) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildReportCsv(report: AdminReport): string {
  const lines: string[] = [];
  const push = (...cells: Array<string | number | null | undefined>) =>
    lines.push(cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
  push('Zimbabwe Shipping report', `${report.range.from} to ${report.range.to}`);
  push('');
  push('Revenue by currency');
  Object.entries(report.revenue.byCurrency).forEach(([c, v]) => push(c, v));
  push('');
  push('Revenue by day', 'GBP', 'EUR');
  report.revenue.series.forEach((p) => push(p.day, p.gbp ?? 0, p.eur ?? 0));
  push('');
  push('Shipments by day');
  report.shipments.series.forEach((p) => push(p.day, p.count));
  push('');
  push('Shipments by status');
  Object.entries(report.shipments.byStatus).forEach(([s, c]) => push(s, c));
  push('');
  push('Collections by route', 'completed', 'failed');
  report.collections.byRoute.forEach((r) => push(r.route, r.done, r.failed));
  push('');
  push('Revenue by route');
  report.revenue.byRoute.forEach((r) => push(r.route, r.currency, r.total));
  push('');
  push('Revenue by payment method');
  report.revenue.byMethod.forEach((r) => push(r.method, r.currency, r.total));
  push('');
  push('Driver performance', 'completed', 'failed');
  report.driverPerformance.forEach((d) => push(d.name, d.completed, d.failed));
  push('');
  push('Quotes requested', report.quotes.requested);
  push('Quotes approved', report.quotes.approved);
  push('Quotes booked', report.quotes.booked);
  push('New customers', report.customers.new);
  push('Returning customers', report.customers.returning);
  push('Delivery success rate %', report.deliveries.successRate ?? '');
  push('Outstanding invoices', report.outstanding.invoices);
  Object.entries(report.outstanding.byCurrency).forEach(([c, v]) => push(`Outstanding ${c}`, v));
  return lines.join('\n');
}

export async function shareReportCsv(report: AdminReport) {
  await Share.share({
    title: `zimbabwe-shipping-report-${report.range.from}-${report.range.to}.csv`,
    message: buildReportCsv(report),
  });
}

export function buildReportHtml(report: AdminReport, title = 'Operations Report'): string {
  const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const table = (headers: string[], rows: Array<Array<string | number | null | undefined>>) => `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px">
      <thead><tr style="background:#009B68;color:#fff">${headers.map((h) => `<th style="padding:7px 10px;text-align:left">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r, i) => `<tr style="background:${i % 2 ? '#fff' : '#f8fafc'};border-bottom:1px solid #e2e8f0">${r.map((c) => `<td style="padding:7px 10px">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,Helvetica,sans-serif;color:#101828;padding:36px 42px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-size:20px;font-weight:700;color:#006B4B">Zimbabwe Shipping</div>
      <div style="font-size:12px;color:#667085">Generated ${new Date().toLocaleString('en-GB')}</div>
    </div>
    <div style="font-size:24px;font-weight:bold;margin-bottom:2px">${esc(title)}</div>
    <div style="font-size:13px;color:#667085;margin-bottom:22px">${report.range.from} — ${report.range.to}</div>
    ${table(['Metric', 'Value'], [
      ['Revenue', currencyLine(report.revenue.byCurrency)],
      ['Previous period revenue', currencyLine(report.revenue.prevByCurrency)],
      ['Shipments', report.shipments.total],
      ['Previous period shipments', report.shipments.prevTotal],
      ['Collections completed', report.collections.completed],
      ['Collections failed', report.collections.failed],
      ['Deliveries completed', report.deliveries.completed],
      ['Delivery success rate', report.deliveries.successRate != null ? `${report.deliveries.successRate}%` : '—'],
      ['Quotes requested / approved / booked', `${report.quotes.requested} / ${report.quotes.approved} / ${report.quotes.booked}`],
      ['New customers', report.customers.new],
      ['Returning customers', report.customers.returning],
      ['Outstanding', `${currencyLine(report.outstanding.byCurrency)} (${report.outstanding.invoices} invoices)`],
      ['Proofs pending / verified / rejected', `${report.proofs.pending} / ${report.proofs.verified} / ${report.proofs.rejected}`],
    ])}
    <div style="font-weight:bold;font-size:13px;margin-bottom:6px">SHIPMENTS BY STATUS</div>
    ${table(['Status', 'Count'], Object.entries(report.shipments.byStatus))}
    <div style="font-weight:bold;font-size:13px;margin-bottom:6px">REVENUE BY ROUTE</div>
    ${table(['Route', 'Currency', 'Total'], report.revenue.byRoute.map((r) => [r.route, r.currency, r.total.toFixed(2)]))}
    <div style="font-weight:bold;font-size:13px;margin-bottom:6px">REVENUE BY PAYMENT METHOD</div>
    ${table(['Method', 'Currency', 'Total'], report.revenue.byMethod.map((r) => [r.method, r.currency, r.total.toFixed(2)]))}
    <div style="font-weight:bold;font-size:13px;margin-bottom:6px">COLLECTIONS BY ROUTE</div>
    ${table(['Route', 'Completed', 'Failed'], report.collections.byRoute.map((r) => [r.route, r.done, r.failed]))}
    <div style="font-weight:bold;font-size:13px;margin-bottom:6px">DRIVER PERFORMANCE</div>
    ${table(['Driver', 'Completed stops', 'Exceptions'], report.driverPerformance.map((d) => [d.name, d.completed, d.failed]))}
  </body></html>`;
}

export async function shareReportPdf(report: AdminReport, title?: string) {
  const { uri } = await Print.printToFileAsync({ html: buildReportHtml(report, title) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}
