
import React from 'react';
import { Package, TruckIcon, Calendar } from 'lucide-react';

export interface StatsCardsProps {
  pendingCount: number;
  inTransitCount: number;
  completedCount: number;
  isMobile: boolean;
  // Add these new prop types to match what's passed in DriverDashboard.tsx
  collectionsCount?: number;
  deliveriesCount?: number;
  schedulesCount?: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  pendingCount,
  inTransitCount,
  completedCount,
  collectionsCount,
  deliveriesCount,
  schedulesCount,
  isMobile
}) => {
  // Use the new props if they're provided, otherwise use the original props
  const pendingValue = collectionsCount !== undefined ? collectionsCount : pendingCount;
  const inTransitValue = deliveriesCount !== undefined ? deliveriesCount : inTransitCount;
  const completedValue = schedulesCount !== undefined ? schedulesCount : completedCount;

  return (
    <div className={`grid ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-3 gap-4'} w-full`}>
      <div className="bg-white shadow-sm rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-full">
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className={`text-xs text-gray-500 ${!isMobile ? 'mb-0.5' : ''}`}>
              {collectionsCount !== undefined ? 'Collections' : 'Pending'}
            </p>
            <p className="font-bold text-lg">{pendingValue}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 p-2 rounded-full">
            <TruckIcon className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className={`text-xs text-gray-500 ${!isMobile ? 'mb-0.5' : ''}`}>
              {deliveriesCount !== undefined ? 'Deliveries' : 'In Transit'}
            </p>
            <p className="font-bold text-lg">{inTransitValue}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-2 rounded-full">
            <Calendar className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className={`text-xs text-gray-500 ${!isMobile ? 'mb-0.5' : ''}`}>
              {schedulesCount !== undefined ? 'Schedules' : 'Completed'}
            </p>
            <p className="font-bold text-lg">{completedValue}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
