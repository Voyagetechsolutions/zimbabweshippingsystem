
import React from 'react';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Shipment } from '@/types/shipment';
import DeliveryCard from './DeliveryCard';
import EmptyState from './EmptyState';

export interface UKCollectionsTabProps {
  loading: boolean;
  isRefreshing: boolean;
  pendingCollections: Shipment[];
  onRefresh: () => void;
  onStatusUpdate: (id: string, newStatus: string) => void;
  onUploadImage: (id: string) => void;
}

const UKCollectionsTab: React.FC<UKCollectionsTabProps> = ({
  loading,
  isRefreshing,
  pendingCollections,
  onRefresh,
  onStatusUpdate,
  onUploadImage
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Collection Instructions</h3>
            <p className="text-sm text-yellow-700">
              Call the customer at least 30 minutes before arrival. Verify all package details upon collection.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex md:hidden justify-end mb-2">
        <Button 
          variant="outline" 
          onClick={onRefresh} 
          disabled={isRefreshing || loading}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : pendingCollections.length > 0 ? (
        <div className="space-y-4">
          {pendingCollections.map((shipment) => (
            <DeliveryCard
              key={shipment.id}
              shipment={shipment}
              type="collection"
              onStatusUpdate={onStatusUpdate}
              onUploadImage={onUploadImage}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Package className="h-12 w-12 text-gray-300" />}
          title="No pending collections"
          description="There are no packages waiting to be collected at this time."
        />
      )}
    </div>
  );
};

export default UKCollectionsTab;
