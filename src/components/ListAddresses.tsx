
import React from 'react';
import { MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Address {
  address: string;
  city: string;
}

interface ListAddressesProps {
  addresses: Address[];
  onRemoveAddress: (index: number) => void;
}

export const ListAddresses: React.FC<ListAddressesProps> = ({ addresses, onRemoveAddress }) => {
  if (addresses.length === 0) {
    return <p className="text-gray-500 italic">No additional addresses added.</p>;
  }

  return (
    <div className="space-y-2">
      {addresses.map((address, index) => (
        <div 
          key={index} 
          className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
        >
          <div>
            <p className="font-medium">{address.address}</p>
            <p className="text-sm text-gray-600">{address.city}</p>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={() => onRemoveAddress(index)}
          >
            <MinusCircle className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
    </div>
  );
};
