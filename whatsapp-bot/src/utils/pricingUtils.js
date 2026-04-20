export function calculatePrice(bookingData) {
  const drums = bookingData.drums || 0;
  const boxes = bookingData.boxes || 0;
  
  // Calculate drum price based on quantity
  let drumPrice = 360; // Default for 1 drum
  if (drums >= 5) drumPrice = 340;
  else if (drums >= 2) drumPrice = 350;
  
  // Calculate box price based on quantity
  let boxPrice = 220; // Default for 1 box
  if (boxes >= 5) boxPrice = 200;
  else if (boxes >= 2) boxPrice = 210;
  
  const drumTotal = drums * drumPrice;
  const boxTotal = boxes * boxPrice;
  
  // Additional services
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

export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency
  }).format(amount);
}
