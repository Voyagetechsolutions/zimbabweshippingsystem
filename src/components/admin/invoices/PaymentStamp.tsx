import { cn } from '@/lib/utils';
import type { InvoicePaymentState } from '@/utils/invoiceTotals';

// A rubber-stamp look for an invoice's payment state, so paid, part paid and
// unpaid read at a glance down a long list. The printed invoice carries the
// same three stamps (BillingInvoiceTemplate).

const STAMP: Record<InvoicePaymentState, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300' },
  partial: { label: 'Partially paid', className: 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300' },
  unpaid: { label: 'Unpaid', className: 'border-red-600 text-red-700 dark:border-red-400 dark:text-red-300' },
};

export default function PaymentStamp({ state, className }: { state: InvoicePaymentState; className?: string }) {
  const stamp = STAMP[state];
  return (
    <span
      className={cn(
        'inline-block -rotate-6 whitespace-nowrap rounded-sm border-2 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-widest',
        stamp.className,
        className,
      )}
    >
      {stamp.label}
    </span>
  );
}
