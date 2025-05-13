
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddressFormProps {
  onSubmit: (address: string, city: string) => void;
  onCancel: () => void;
}

export const AddressForm: React.FC<AddressFormProps> = ({ onSubmit, onCancel }) => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim() && city.trim()) {
      onSubmit(address, city);
      setAddress('');
      setCity('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md bg-gray-50">
      <div>
        <Label htmlFor="address">Address</Label>
        <Input 
          id="address"
          type="text" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter street address"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="city">City</Label>
        <Input 
          id="city"
          type="text" 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Address
        </Button>
      </div>
    </form>
  );
};
