
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, CheckCircle2 } from 'lucide-react';

interface StatsCardsProps {
  pendingCount: number;
  inTransitCount: number;
  completedCount: number;
  isMobile: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  pendingCount,
  inTransitCount,
  completedCount,
  isMobile
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className={`flex flex-row items-center justify-between pb-2 ${isMobile ? 'space-y-0' : ''}`}>
          <CardTitle className="text-sm font-medium text-gray-500">
            Pending Collections
          </CardTitle>
          <Package className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-xs text-gray-500">Packages to collect</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className={`flex flex-row items-center justify-between pb-2 ${isMobile ? 'space-y-0' : ''}`}>
          <CardTitle className="text-sm font-medium text-gray-500">
            In Transit
          </CardTitle>
          <Truck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inTransitCount}</div>
          <p className="text-xs text-gray-500">Packages in transit</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className={`flex flex-row items-center justify-between pb-2 ${isMobile ? 'space-y-0' : ''}`}>
          <CardTitle className="text-sm font-medium text-gray-500">
            Completed
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedCount}</div>
          <p className="text-xs text-gray-500">Recently delivered</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
