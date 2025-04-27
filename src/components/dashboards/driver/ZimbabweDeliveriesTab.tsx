
import React from 'react';
import { Truck } from 'lucide-react';
import { Shipment } from '@/types/shipment';
import DeliveryCard from './DeliveryCard';
import EmptyState from './EmptyState';

export interface ZimbabweDeliveriesTabProps {
  loading: boolean;
  inTransitDeliveries: any[];
  onStatusUpdate: (id: string, newStatus: string) => Promise<void>;
  onUploadImage: (id: string) => void;
}

const ZimbabweDeliveriesTab: React.FC<ZimbabweDeliveriesTabProps> = ({
  loading,
  inTransitDeliveries,
  onStatusUpdate,
  onUploadImage = () => {}
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
        <div className="flex items-start">
          <Truck className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Delivery Instructions</h3>
            <p className="text-sm text-blue-700">
              Take photos of all delivered packages as proof of delivery. Get recipient signatures when possible.
            </p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : inTransitDeliveries.length > 0 ? (
        <div className="space-y-4">
          {inTransitDeliveries.map((shipment) => (
            <DeliveryCard
              key={shipment.id}
              shipment={shipment}
              type="delivery"
              onStatusUpdate={onStatusUpdate}
              onUploadImage={onUploadImage}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Truck className="h-12 w-12 text-gray-300" />}
          title="No deliveries pending"
          description="There are no packages to be delivered at the moment."
        />
      )}
    </div>
  );
};

export default ZimbabweDeliveriesTab;
