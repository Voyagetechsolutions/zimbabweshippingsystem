
import React from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2 
} from 'lucide-react';

export interface StatsCardsProps {
  pendingCount: number;
  inTransitCount: number;
  completedCount: number;
  isMobile?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ 
  pendingCount, 
  inTransitCount, 
  completedCount,
  isMobile = false
}) => {
  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-4'}`}>
      <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
        <div className="bg-blue-100 p-2 rounded-md mr-3">
          <Package className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Pending Collections</p>
          <p className="text-lg font-semibold">{pendingCount}</p>
        </div>
      </div>
      
      <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
        <div className="bg-amber-100 p-2 rounded-md mr-3">
          <Truck className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="text-lg font-semibold">{inTransitCount}</p>
        </div>
      </div>
      
      <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
        <div className="bg-green-100 p-2 rounded-md mr-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-lg font-semibold">{completedCount}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
