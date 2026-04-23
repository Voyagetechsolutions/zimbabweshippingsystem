// UK pricing — matches website (SimplifiedBookingForm)
export function calculatePrice(bookingData) {
  const drums = bookingData.drums || 0;

  // Drum price by quantity (GBP)
  let drumPrice = 280; // 1 drum
  if (drums >= 5) drumPrice = 260;
  else if (drums >= 2) drumPrice = 270;

  const drumTotal = drums * drumPrice;

  // Metal seal: £5 per drum (only if metalSeal chosen and drums present)
  const sealCost = bookingData.metalSeal && drums > 0 ? drums * 5 : 0;

  // Door-to-door flat £25
  const doorToDoorCost = bookingData.doorToDoor ? 25 : 0;

  // Purchased drums (if supplied by us at collection)
  const purchaseDrumQty = bookingData.purchaseDrumQuantity || 0;
  let purchaseDrumUnitPrice = 0;
  if (bookingData.purchaseDrumType === 'metal') purchaseDrumUnitPrice = 40;
  else if (bookingData.purchaseDrumType === 'plastic') purchaseDrumUnitPrice = 50;
  const purchaseDrumsCost = purchaseDrumQty * purchaseDrumUnitPrice;

  const subtotal = drumTotal;
  const total = subtotal + sealCost + doorToDoorCost + purchaseDrumsCost;

  return {
    drumPrice,
    drumTotal,
    sealCost,
    doorToDoorCost,
    purchaseDrumsCost,
    purchaseDrumUnitPrice,
    subtotal,
    total
  };
}

export function formatCurrency(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency
  }).format(amount);
}
