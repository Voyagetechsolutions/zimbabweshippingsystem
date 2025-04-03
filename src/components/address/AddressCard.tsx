
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Star, StarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Address {
  id: string;
  address_name: string;
  recipient_name: string;
  street_address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  phone_number: string | null;
  is_default: boolean | null;
}

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefault
}) => {
  const { toast } = useToast();

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      onDelete(address.id);
    }
  };

  const handleSetDefault = () => {
    onSetDefault(address.id);
    toast({
      title: "Default address updated",
      description: `${address.address_name} is now your default address`,
    });
  };

  return (
    <Card className={`relative ${address.is_default ? 'border-zim-green' : ''}`}>
      {address.is_default && (
        <div className="absolute top-2 right-2 bg-zim-green text-white text-xs px-2 py-1 rounded-full">
          Default
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{address.address_name}</h3>
            <p className="text-sm text-gray-500 mt-1">{address.recipient_name}</p>
          </div>
        </div>
        
        <div className="mt-3 space-y-1 text-sm">
          <p>{address.street_address}</p>
          <p>{address.city}{address.state ? `, ${address.state}` : ''} {address.postal_code || ''}</p>
          <p>{address.country}</p>
          {address.phone_number && <p className="mt-2">📞 {address.phone_number}</p>}
        </div>
        
        <div className="mt-4 flex space-x-2 justify-end">
          {!address.is_default && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSetDefault}
              className="flex items-center"
            >
              <Star className="h-4 w-4 mr-1" />
              Set Default
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(address)}
            className="flex items-center"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDelete}
            className="flex items-center text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddressCard;
