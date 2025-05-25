
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface QuoteData {
  quotedAmount: number;
  quoteId: string;
  description: string;
  category?: string;
  specificItem?: string;
}

interface QuoteToBookingHandlerProps {
  onQuoteDataReceived?: (data: QuoteData) => void;
}

const QuoteToBookingHandler: React.FC<QuoteToBookingHandlerProps> = ({ onQuoteDataReceived }) => {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.customQuote && onQuoteDataReceived) {
      onQuoteDataReceived(location.state.customQuote);
    }
  }, [location.state, onQuoteDataReceived]);

  return null; // This is a utility component that doesn't render anything
};

export default QuoteToBookingHandler;
