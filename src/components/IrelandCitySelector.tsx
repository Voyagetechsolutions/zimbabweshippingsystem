
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getIrelandCities, getDateForIrelandCity } from '@/data/collectionSchedule';

interface IrelandCitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  onCollectionDateChange: (date: string | null) => void;
}

export const IrelandCitySelector: React.FC<IrelandCitySelectorProps> = ({ 
  value, 
  onChange,
  onCollectionDateChange
}) => {
  const [cities, setCities] = useState<string[]>([]);
  
  useEffect(() => {
    // Load Ireland cities
    const irelandCities = getIrelandCities();
    setCities(irelandCities);
  }, []);
  
  const handleCityChange = (cityValue: string) => {
    onChange(cityValue);
    
    // Get collection date for this city
    const collectionDate = getDateForIrelandCity(cityValue);
    onCollectionDateChange(collectionDate);
  };
  
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleCityChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select city" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default IrelandCitySelector;
