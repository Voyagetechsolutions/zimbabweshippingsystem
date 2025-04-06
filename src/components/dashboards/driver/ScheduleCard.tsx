
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRightCircle, Package, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface ScheduleCardProps {
  schedule: any;
  shipments: any[];
  isExpanded: boolean;
  onToggleDetails: (id: string) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  shipments,
  isExpanded,
  onToggleDetails,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Booking Confirmed</Badge>;
      case 'Ready for Pickup':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Ready for Pickup</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeliveryAddress = (shipment: any) => {
    if (shipment.metadata && typeof shipment.metadata === 'object') {
      const pickup_area = shipment.metadata.pickup_area;
      return pickup_area ? pickup_area : shipment.destination;
    }
    return shipment.destination;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-base md:text-lg mb-1">{schedule.route}</h3>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{schedule.pickup_date}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.isArray(schedule.areas) && schedule.areas.map((area: string, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-gray-100">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <Button variant="outline" className="flex items-center w-full md:w-auto justify-center">
              <ArrowRightCircle className="h-4 w-4 mr-2" />
              <span>View Route</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center w-full md:w-auto justify-center"
              onClick={() => onToggleDetails(schedule.id)}
            >
              <Package className="h-4 w-4 mr-2" />
              <span>View Shipments ({shipments?.length || 0})</span>
              <ChevronDown className={`h-4 w-4 ml-2 transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
        
        <Collapsible open={isExpanded} className="mt-4">
          <CollapsibleContent>
            {shipments && shipments.length > 0 ? (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">Scheduled Shipments</h4>
                <div className="space-y-2">
                  {shipments.map((shipment: any) => (
                    <div key={shipment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{shipment.tracking_number}</p>
                        <p className="text-xs text-gray-500">{getDeliveryAddress(shipment)}</p>
                      </div>
                      {getStatusBadge(shipment.status)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t text-center py-4">
                <p className="text-gray-500">No shipments scheduled for this route.</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default ScheduleCard;
