// UK pricing — matches the website (SimplifiedBookingForm).

export const CURRENCY = 'GBP';
export const CURRENCY_SYMBOL = '£';
export const COUNTRY = 'England';
export const CASH_DISCOUNT_PER_DRUM = 0;
export const PAY_ON_ARRIVAL_MULTIPLIER = 1.20;
export const METAL_SEAL_PRICE = 5;

export function getDrumPrice(quantity) {
  if (quantity >= 5) return 260;
  if (quantity >= 2) return 270;
  return 280;
}

export const PURCHASE_DRUM_PRICES = {
  metal: 40,
  plastic: 50,
};

export function getPurchaseDrumPrice(type) {
  return PURCHASE_DRUM_PRICES[type] || 0;
}

export function getMetalSealPrice() {
  return METAL_SEAL_PRICE;
}

// Mirrors SimplifiedBookingForm.calculateBaseTotal / calculateFinalTotal.
export function calculatePricing(bookingData) {
  const drumQty = bookingData.includeDrums ? (bookingData.drumQuantity || 0) : 0;
  const drumUnit = drumQty > 0 ? getDrumPrice(drumQty) : 0;
  const drumTotal = drumQty * drumUnit;

  const sealUnit = METAL_SEAL_PRICE;
  const sealQty = bookingData.wantMetalSeal && drumQty > 0 ? drumQty : 0;
  const sealCost = sealQty * sealUnit;

  // Purchase-drums add-on (UK only).
  let purchaseDrumQty = 0;
  let purchaseDrumUnit = 0;
  let purchaseDrumTotal = 0;
  if (bookingData.purchaseDrums && bookingData.purchaseDrumType) {
    purchaseDrumQty = bookingData.purchaseDrumQuantity || 0;
    purchaseDrumUnit = getPurchaseDrumPrice(bookingData.purchaseDrumType);
    purchaseDrumTotal = purchaseDrumQty * purchaseDrumUnit;
  }

  const baseTotal = drumTotal + sealCost + purchaseDrumTotal;

  let finalTotal = baseTotal;
  let cashDiscount = 0;
  let payOnArrivalPremium = 0;

  if (bookingData.paymentMethod === 'payOnArrival') {
    finalTotal = baseTotal * PAY_ON_ARRIVAL_MULTIPLIER;
    payOnArrivalPremium = finalTotal - baseTotal;
  }

  return {
    drumQty,
    drumUnit,
    drumTotal,
    sealQty,
    sealUnit,
    sealCost,
    purchaseDrumQty,
    purchaseDrumUnit,
    purchaseDrumTotal,
    purchaseDrumType: bookingData.purchaseDrumType || null,
    baseTotal,
    cashDiscount,
    payOnArrivalPremium,
    finalTotal,
    currency: CURRENCY,
    currencySymbol: CURRENCY_SYMBOL,
  };
}

export function formatMoney(amount) {
  return `${CURRENCY_SYMBOL}${Number(amount).toFixed(2)}`;
}
