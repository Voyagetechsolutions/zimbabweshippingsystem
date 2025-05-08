
import React from 'react';
import { irelandCities } from '@/utils/IrelandCities';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FormControl } from '@/components/ui/form';

interface IrelandCitySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const IrelandCitySelect = ({ value, onChange, disabled = false, className = '' }: IrelandCitySelectProps) => {
  return (
    <Select 
      value={value} 
      onValueChange={onChange} 
      disabled={disabled}
    >
      <FormControl>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select a city" />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {irelandCities.map((city) => (
          <SelectItem key={city} value={city}>{city}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default IrelandCitySelect;
