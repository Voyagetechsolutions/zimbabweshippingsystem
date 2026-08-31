export type MoneyLine = { quantity: number; unitPrice: number; discount?: number; taxRate?: number };

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateDocumentTotals(lines: MoneyLine[]) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const discount = roundMoney(lines.reduce((sum, line) => sum + (line.discount || 0), 0));
  const tax = roundMoney(lines.reduce((sum, line) => {
    const net = Math.max(0, line.quantity * line.unitPrice - (line.discount || 0));
    return sum + net * ((line.taxRate || 0) / 100);
  }, 0));
  return { subtotal, discount, tax, total: roundMoney(Math.max(0, subtotal - discount) + tax) };
}

export function invoiceBalance(total: number, allocations: number[], credits: number[] = []) {
  const paid = roundMoney(allocations.reduce((sum, amount) => sum + amount, 0));
  const credited = roundMoney(credits.reduce((sum, amount) => sum + amount, 0));
  return { paid, credited, balance: roundMoney(Math.max(0, total - paid - credited)) };
}

export function paymentAllocation(paymentAmount: number, existingAllocations: number[]) {
  const allocated = roundMoney(existingAllocations.reduce((sum, amount) => sum + amount, 0));
  return { allocated, unallocated: roundMoney(Math.max(0, paymentAmount - allocated)), overallocated: allocated > paymentAmount };
}

export function convertCurrency(originalAmount: number, rateToBase: number) {
  if (!(rateToBase > 0)) throw new Error('Exchange rate must be greater than zero');
  return roundMoney(originalAmount * rateToBase);
}

export function journalBalance(lines: Array<{ debit?: number; credit?: number }>) {
  const debit = roundMoney(lines.reduce((sum, line) => sum + (line.debit || 0), 0));
  const credit = roundMoney(lines.reduce((sum, line) => sum + (line.credit || 0), 0));
  return { debit, credit, balanced: debit > 0 && Math.abs(debit - credit) < 0.005 };
}

export function receivableAge(dueDate: string, asOf = new Date()) {
  const due = new Date(`${dueDate}T12:00:00Z`).getTime();
  const current = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate(), 12);
  const days = Math.floor((current - due) / 86_400_000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

export function allocateSharedCost(totalCost: number, weights: number[]) {
  const weightTotal = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (weightTotal <= 0) throw new Error('Allocation weights must total more than zero');
  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return roundMoney(totalCost - allocated);
    const amount = roundMoney(totalCost * (Math.max(0, weight) / weightTotal));
    allocated += amount;
    return amount;
  });
}
