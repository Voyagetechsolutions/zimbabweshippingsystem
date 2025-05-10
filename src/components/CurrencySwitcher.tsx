
import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShipping } from '@/contexts/ShippingContext';

const CurrencySwitcher = () => {
  const { currencies, selectedCurrency, setSelectedCurrency } = useShipping();

  const handleCurrencyChange = (value: string) => {
    const newCurrency = currencies.find(currency => currency.code === value);
    if (newCurrency) {
      setSelectedCurrency(newCurrency);
    }
  };

  return (
    <div className="flex items-center">
      <Select onValueChange={handleCurrencyChange} defaultValue={selectedCurrency?.code || 'GBP'}>
        <SelectTrigger className="w-[90px] h-8 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700">
          <SelectValue placeholder={selectedCurrency?.code || 'GBP'}>
            {selectedCurrency?.symbol} {selectedCurrency?.code}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {currencies.map((currency) => (
              <SelectItem key={currency.code} value={currency.code || "unknown"}>
                {currency.symbol} {currency.code}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencySwitcher;
