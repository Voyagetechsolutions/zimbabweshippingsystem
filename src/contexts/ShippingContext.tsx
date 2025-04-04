
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

  return (
    <ShippingContext.Provider
      value={{
        currencies: availableCurrencies,
        selectedCurrency,
        setSelectedCurrency,
        convertPrice,
        formatPrice
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
