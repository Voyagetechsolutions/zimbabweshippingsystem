
/**
 * Calculates the shipping cost based on origin and destination countries
 * 
 * @param origin Origin country code
 * @param destination Destination country code
 * @returns Calculated shipping cost in GBP
 */
export const calculateShippingCost = (origin: string, destination: string): number => {
  // Base rates for different routes
  const rates = {
    'uk-zw': 350, // UK to Zimbabwe
    'ie-zw': 380, // Ireland to Zimbabwe
    'us-zw': 480, // US to Zimbabwe
    'ca-zw': 490, // Canada to Zimbabwe
    'default': 400 // Default rate for other routes
  };
  
  const routeKey = `${origin}-${destination}`;
  return rates[routeKey as keyof typeof rates] || rates.default;
};

/**
 * Calculates additional charges based on shipment options
 * 
 * @param options Options that affect shipping cost
 * @returns Additional charges in GBP
 */
export const calculateAdditionalCharges = (options: {
  weight?: number;
  express?: boolean;
  insurance?: boolean;
  fragile?: boolean;
}): number => {
  let additionalCost = 0;
  
  // Weight surcharge
  if (options.weight && options.weight > 20) {
    additionalCost += (options.weight - 20) * 5;
  }
  
  // Express delivery
  if (options.express) {
    additionalCost += 75;
  }
  
  // Insurance
  if (options.insurance) {
    additionalCost += 25;
  }
  
  // Fragile items handling
  if (options.fragile) {
    additionalCost += 15;
  }
  
  return additionalCost;
};
