
import React, { createContext, useContext, useState } from 'react';

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
};

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export const ShippingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails | null>(null);
  const [recipientDetails, setRecipientDetails] = useState<any>(null);
  const [senderDetails, setSenderDetails] = useState<any>(null);

  const clearShippingData = () => {
    setShipmentDetails(null);
    setRecipientDetails(null);
    setSenderDetails(null);
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
