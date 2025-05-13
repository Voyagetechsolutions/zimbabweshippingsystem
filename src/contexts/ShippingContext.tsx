
import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the currency type
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Exchange rate relative to GBP (base currency)
}

// Available currencies
const availableCurrencies: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRate: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 1.35 },
  { code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: 1.15 },
  { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar', exchangeRate: 487.25 }
];

interface ShippingContextType {
  currencies: Currency[];
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (priceInGBP: number) => number;
  formatPrice: (price: number) => string;
  calculateShippingCost: (country: string, postalCode: string, shipmentType: string, weight?: string) => number;
}

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export function ShippingProvider({ children }: { children: React.ReactNode }) {
  // Get the currency from localStorage or default to GBP
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      try {
        return JSON.parse(savedCurrency);
      } catch (e) {
        return availableCurrencies[0]; // Default to GBP
      }
    }
    return availableCurrencies[0]; // Default to GBP
  });

  // Save selected currency to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedCurrency', JSON.stringify(selectedCurrency));
  }, [selectedCurrency]);

  // Convert price from GBP to selected currency
  const convertPrice = (priceInGBP: number): number => {
    return priceInGBP * selectedCurrency.exchangeRate;
  };

  // Format price with currency symbol
  const formatPrice = (price: number): string => {
    return `${selectedCurrency.symbol}${price.toFixed(2)}`;
  };

  // Calculate shipping cost based on destination and shipment type
  const calculateShippingCost = (country: string, postalCode: string, shipmentType: string, weight?: string): number => {
    // Base costs in GBP
    const baseCosts = {
      'drum': {
        'England': 125,
        'Ireland': 150,
        'Zimbabwe': 250
      },
      'parcel': {
        'England': 25,
        'Ireland': 35,
        'Zimbabwe': 75
      }
    };
    
    // Get the base cost or default to a reasonable value if not found
    const baseShippingType = shipmentType === 'drum' ? 'drum' : 'parcel';
    const baseCost = baseCosts[baseShippingType]?.[country] || 100;
    
    // For parcels, adjust by weight if provided
    if (shipmentType === 'parcel' && weight) {
      const weightNumber = parseFloat(weight);
      if (!isNaN(weightNumber)) {
        // £5 per kg additional fee for parcels over 2kg
        const additionalWeight = Math.max(0, weightNumber - 2);
        return baseCost + (additionalWeight * 5);
      }
    }
    
    return baseCost;
  };

  return (
    <ShippingContext.Provider
      value={{
        currencies: availableCurrencies,
        selectedCurrency,
        setSelectedCurrency,
        convertPrice,
        formatPrice,
        calculateShippingCost
      }}
    >
      {children}
    </ShippingContext.Provider>
  );
}

export const useShipping = () => {
  const context = useContext(ShippingContext);
  if (context === undefined) {
    throw new Error('useShipping must be used within a ShippingProvider');
  }
  return context;
};
