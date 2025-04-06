
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, User, Phone, Truck, Package, Camera, CheckCircle2 } from 'lucide-react';

interface DeliveryCardProps {
  shipment: any;
  type: 'collection' | 'delivery';
  onStatusUpdate: (id: string, newStatus: string) => void;
  onUploadImage: (id: string) => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ 
  shipment, 
  type, 
  onStatusUpdate,
  onUploadImage
}) => {
  const getRecipientInfo = (shipment: any) => {
    if (shipment.metadata && typeof shipment.metadata === 'object') {
      const name = shipment.metadata.recipient_name;
      const phone = shipment.metadata.recipient_phone;
      
      if (name && phone) {
        return { name, phone };
      }
    }
    return { name: 'Not specified', phone: 'Not specified' };
  };

  const getDeliveryAddress = (shipment: any) => {
    if (shipment.metadata && typeof shipment.metadata === 'object') {
      const pickup_area = shipment.metadata.pickup_area;
      return pickup_area ? pickup_area : shipment.destination;
    }
    return shipment.destination;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Booking Confirmed</Badge>;
      case 'Ready for Pickup':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Ready for Pickup</Badge>;
      case 'Processing in Warehouse (UK)':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Processing (UK)</Badge>;
      case 'Customs Clearance':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Customs Clearance</Badge>;
      case 'Processing in Warehouse (ZW)':
        return <Badge className="bg-pink-100 text-pink-800 border-pink-300">Processing (ZW)</Badge>;
      case 'In Transit':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Transit</Badge>;
      case 'Out for Delivery':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Out for Delivery</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const recipientInfo = getRecipientInfo(shipment);
  
  // Determine the action button based on shipment status and type
  const renderActionButton = () => {
    if (type === 'collection' && shipment.status === 'Ready for Pickup') {
      return (
        <Button 
          onClick={() => onStatusUpdate(shipment.id, 'Processing in Warehouse (UK)')}
          className="bg-zim-green hover:bg-zim-green/90 flex w-full md:w-auto justify-center"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          <span>Mark as Collected</span>
        </Button>
      );
    } else if (type === 'delivery') {
      if (shipment.status === 'Customs Clearance') {
        return (
          <Button 
            onClick={() => onStatusUpdate(shipment.id, 'Processing in Warehouse (ZW)')}
            className="bg-purple-500 hover:bg-purple-600 flex w-full md:w-auto justify-center"
          >
            <Package className="h-4 w-4 mr-2" />
            <span>Mark as Processing in Zimbabwe</span>
          </Button>
        );
      } else if (shipment.status === 'Processing in Warehouse (ZW)') {
        return (
          <Button 
            onClick={() => onStatusUpdate(shipment.id, 'In Transit')}
            className="bg-pink-500 hover:bg-pink-600 flex w-full md:w-auto justify-center"
          >
            <Truck className="h-4 w-4 mr-2" />
            <span>Mark as In Transit</span>
          </Button>
        );
      } else if (shipment.status === 'In Transit') {
        return (
          <Button 
            onClick={() => onStatusUpdate(shipment.id, 'Out for Delivery')}
            className="bg-blue-500 hover:bg-blue-600 flex w-full md:w-auto justify-center"
          >
            <Truck className="h-4 w-4 mr-2" />
            <span>Mark Out for Delivery</span>
          </Button>
        );
      } else if (shipment.status === 'Out for Delivery') {
        return (
          <Button 
            onClick={() => onUploadImage(shipment.id)}
            className="bg-green-500 hover:bg-green-600 flex w-full md:w-auto justify-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            <span>Upload Delivery Photo</span>
          </Button>
        );
      }
    }
    
    return null;
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-medium text-base md:text-lg flex items-center">
                {type === 'collection' ? (
                  <Package className="h-4 w-4 mr-2 text-zim-green" />
                ) : (
                  <Truck className="h-4 w-4 mr-2 text-blue-500" />
                )}
                {type === 'collection' ? 'Collection' : 'Delivery'} #{shipment.tracking_number}
              </h3>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[180px] md:max-w-none">{getDeliveryAddress(shipment)}</span>
              </div>
            </div>
            {getStatusBadge(shipment.status)}
          </div>
        </div>
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center mb-2">
                <User className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700">{recipientInfo.name}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700">{recipientInfo.phone}</span>
              </div>
            </div>
            <div className="flex items-end justify-start md:justify-end mt-4 md:mt-0">
              {renderActionButton()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryCard;
