
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, MapPin, CheckCircle } from 'lucide-react';
import { Address } from '@/types/address';

interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (addressId: string) => void;
  onSetDefault?: (addressId: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (address: Address) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = false,
  selected = false,
  onSelect
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(address.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(address);
  };

  const handleSetDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSetDefault) onSetDefault(address.id);
  };

  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(address);
    }
  };

  return (
    <Card 
      className={`relative overflow-hidden ${selectable ? 'cursor-pointer' : ''} 
      ${selected ? 'ring-2 ring-zim-green border-zim-green' : ''} 
      hover:shadow-md transition-all`}
      onClick={handleCardClick}
    >
      {address.is_default && (
        <div className="absolute top-0 right-0">
          <Badge className="bg-zim-green text-white rounded-none rounded-bl-md">
            <CheckCircle className="h-3 w-3 mr-1" />
            Default
          </Badge>
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex items-start mb-3">
          <MapPin className="h-5 w-5 text-zim-green mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium mb-1">{address.address_name}</h3>
            <p className="text-gray-800">{address.recipient_name}</p>
          </div>
        </div>
        <div className="text-sm text-gray-600 ml-7">
          <p>{address.street_address}</p>
          <p>
            {address.city}
            {address.state ? `, ${address.state}` : ''}
            {address.postal_code ? ` ${address.postal_code}` : ''}
          </p>
          <p>{address.country}</p>
          {address.phone_number && <p className="mt-1">📞 {address.phone_number}</p>}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-end space-x-2">
        {!address.is_default && onSetDefault && (
          <Button variant="ghost" size="sm" onClick={handleSetDefault}>
            Set as Default
          </Button>
        )}
        {onEdit && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button variant="outline" size="sm" className="text-red-600" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default AddressCard;
export type { Address };
