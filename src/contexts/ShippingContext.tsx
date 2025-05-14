
import React, { createContext, useContext, useState } from 'react';

// Define currency type
type Currency = {
  code: string;
  symbol: string;
  rate: number;
};

type ShipmentDetails = {
  originCountry: string;
  destinationCountry: string;
  includeDrums: boolean;
  quantity: number;
  includeOtherItems: boolean;
  category?: string;
  description?: string;
  specificItem?: string;
  totalAmount?: number;
  customQuoteId?: string;
  isCustomQuote?: boolean;
};

type ShippingContextType = {
  shipmentDetails: ShipmentDetails | null;
  setShipmentDetails: React.Dispatch<React.SetStateAction<ShipmentDetails | null>>;
  recipientDetails: any;
  setRecipientDetails: React.Dispatch<React.SetStateAction<any>>;
  senderDetails: any;
  setSenderDetails: React.Dispatch<React.SetStateAction<any>>;
  clearShippingData: () => void;
  // Add the missing properties
  currencies: Currency[];
  selectedCurrency: Currency;
  setSelectedCurrency: React.Dispatch<React.SetStateAction<Currency>>;
  formatPrice: (amount: number) => string;
};

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export const ShippingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails | null>(null);
  const [recipientDetails, setRecipientDetails] = useState<any>(null);
  const [senderDetails, setSenderDetails] = useState<any>(null);
  
  // Add currencies state
  const [currencies] = useState<Currency[]>([
    { code: 'GBP', symbol: '£', rate: 1 },
    { code: 'USD', symbol: '$', rate: 1.27 },
    { code: 'EUR', symbol: '€', rate: 1.17 },
  ]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);

  const clearShippingData = () => {
    setShipmentDetails(null);
    setRecipientDetails(null);
    setSenderDetails(null);
  };

  // Add formatPrice function
  const formatPrice = (amount: number): string => {
    const convertedAmount = amount * selectedCurrency.rate;
    return `${selectedCurrency.symbol}${convertedAmount.toFixed(2)}`;
  };

  return (
    <ShippingContext.Provider
      value={{
        shipmentDetails,
        setShipmentDetails,
        recipientDetails,
        setRecipientDetails,
        senderDetails,
        setSenderDetails,
        clearShippingData,
        // Add the new properties to the context value
        currencies,
        selectedCurrency,
        setSelectedCurrency,
        formatPrice,
      }}
    >
      {children}
    </ShippingContext.Provider>
  );
};

export const useShipping = () => {
  const context = useContext(ShippingContext);
  if (context === undefined) {
    throw new Error('useShipping must be used within a ShippingProvider');
  }
  return context;
};
