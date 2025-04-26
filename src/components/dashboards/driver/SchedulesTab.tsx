
import React from 'react';
import { Calendar } from 'lucide-react';
import { Shipment } from '@/types/shipment';
import ScheduleCard from './ScheduleCard';
import EmptyState from './EmptyState';

interface SchedulesTabProps {
  loading: boolean;
  collectionSchedules: any[];
  scheduleShipments: Record<string, Shipment[]>;
  expandedSchedule: string | null;
  onToggleDetails: (id: string) => void;
}

const SchedulesTab: React.FC<SchedulesTabProps> = ({
  loading,
  collectionSchedules,
  scheduleShipments,
  expandedSchedule,
  onToggleDetails,
}) => {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : collectionSchedules.length > 0 ? (
        <div className="space-y-4">
          {collectionSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              shipments={scheduleShipments[schedule.id] || []}
              isExpanded={expandedSchedule === schedule.id}
              onToggleDetails={onToggleDetails}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-gray-300" />}
          title="No schedules available"
          description="There are no collection schedules at the moment."
        />
      )}
    </div>
  );
};

export default SchedulesTab;
