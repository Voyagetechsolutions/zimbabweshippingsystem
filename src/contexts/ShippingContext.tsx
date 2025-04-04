
import React, { createContext, useContext, useState } from 'react';

// Define types
export type Currency = {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate relative to GBP (base currency)
};

type ShippingContextType = {
  currencies: Currency[];
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (priceInGBP: number) => number;
  formatPrice: (price: number) => string;
};

// Available currencies
const availableCurrencies: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRate: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 1.25 },
  { code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: 1.16 },
  { code: 'ZWL', symbol: 'ZWL', name: 'Zimbabwean Dollar', exchangeRate: 1590 },
];

// Create context with default values
const ShippingContext = createContext<ShippingContextType>({
  currencies: availableCurrencies,
  selectedCurrency: availableCurrencies[0],
  setSelectedCurrency: () => {},
  convertPrice: () => 0,
  formatPrice: () => '',
});

export const ShippingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(availableCurrencies[0]);

  // Convert price from GBP to selected currency
  const convertPrice = (priceInGBP: number): number => {
    return priceInGBP * selectedCurrency.exchangeRate;
  };

  // Format price with currency symbol
  const formatPrice = (price: number): string => {
    const convertedPrice = convertPrice(price);
    
    if (selectedCurrency.code === 'ZWL') {
      // For ZWL, format with no decimal places due to high exchange rate
      return `${selectedCurrency.symbol} ${Math.round(convertedPrice).toLocaleString()}`;
    }
    
    return `${selectedCurrency.symbol}${convertedPrice.toFixed(2)}`;
  };

  const value = {
    currencies: availableCurrencies,
    selectedCurrency,
    setSelectedCurrency,
    convertPrice,
    formatPrice,
  };

  return <ShippingContext.Provider value={value}>{children}</ShippingContext.Provider>;
};

export const useShipping = () => useContext(ShippingContext);
