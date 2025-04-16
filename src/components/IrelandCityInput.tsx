
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRouteForIrelandCity, irelandRouteSchedules } from '@/utils/postalCodeUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface IrelandCityInputProps {
  onChange: (city: string, route: string | null, collectionDate: string | null) => void;
}

const IrelandCityInput: React.FC<IrelandCityInputProps> = ({ onChange }) => {
  const [city, setCity] = useState('');
  const [route, setRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [noRouteFound, setNoRouteFound] = useState(false);
  
  useEffect(() => {
    if (city) {
      const cityRoute = getRouteForIrelandCity(city);
      setRoute(cityRoute);
      
      if (cityRoute) {
        setCollectionDate(irelandRouteSchedules[cityRoute]);
        setNoRouteFound(false);
      } else {
        setCollectionDate(null);
        setNoRouteFound(true);
      }
      
      // Notify parent component
      onChange(city, cityRoute, cityRoute ? irelandRouteSchedules[cityRoute] : null);
    } else {
      setRoute(null);
      setCollectionDate(null);
      setNoRouteFound(false);
      onChange('', null, null);
    }
  }, [city, onChange]);
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ireland-city">City in Ireland</Label>
        <Input
          id="ireland-city"
          placeholder="Enter your city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1"
        />
      </div>
      
      {route && collectionDate && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-medium text-green-800">Collection Information</h4>
          <p className="text-green-700 mt-1">Route: {route}</p>
          <p className="text-green-700">Collection Date: {collectionDate}</p>
        </div>
      )}
      
      {noRouteFound && city && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Area not available</AlertTitle>
          <AlertDescription>
            Your area is not available but will be considered. Contact support to make a booking: +353 871954910.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default IrelandCityInput;
