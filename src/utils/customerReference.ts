export function buildCustomerReference(
  firstName: string,
  lastName: string,
  phone: string,
  shipmentDate: string | Date,
  sequence?: number,
) {
  const name = `${firstName || ''}${lastName || ''}`.replace(/[^a-z]/gi, '').toUpperCase();
  const prefix = (name || 'CUS').slice(0, 3).padEnd(3, 'X');
  const digits = String(phone || '').replace(/\D/g, '');
  const suffix = digits.slice(-4).padStart(4, '0');
  const date = shipmentDate instanceof Date ? shipmentDate : new Date(shipmentDate);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const mmyy = `${String(safeDate.getMonth() + 1).padStart(2, '0')}${String(safeDate.getFullYear()).slice(-2)}`;
  const base = `${prefix}-${mmyy}-${suffix}`;
  return sequence && sequence > 1 ? `${base}-${String(sequence).padStart(2, '0')}` : base;
}

