export function calculatePrice(bookingData) {
  const drums = bookingData.drums || 0;
  const boxes = bookingData.boxes || 0;
  
  // Calculate drum price based on quantity (in GBP)
  let drumPrice = 75; // Default for 1 drum
  if (drums >= 5) drumPrice = 65;
  else if (drums >= 2) drumPrice = 70;
  
  // Calculate box price based on quantity (in GBP)
  let boxPrice = 25; // Default for 1 box
  if (boxes >= 5) boxPrice = 20;
  else if (boxes >= 2) boxPrice = 23;
  
  const drumTotal = drums * drumPrice;
  const boxTotal = boxes * boxPrice;
  
  // Additional services (in GBP)
  const sealCost = bookingData.metalSeal ? 7 : 0;
  const doorToDoorCost = bookingData.doorToDoor ? 25 : 0;
  
  const subtotal = drumTotal + boxTotal;
  const total = subtotal + sealCost + doorToDoorCost;
  
  return {
    drumPrice,
    boxPrice,
    drumTotal,
    boxTotal,
    sealCost,
    doorToDoorCost,
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
