
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment, ShipmentMetadata } from '@/types/shipment';

// Extending the Shipment interface to include profiles
interface ShipmentWithProfiles extends Shipment {
  profiles?: {
    email?: string;
    full_name?: string;
  };
}

// Type guard function to check if a value is a valid ShipmentMetadata object
function isValidMetadata(metadata: any): metadata is ShipmentMetadata {
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata);
}

// Helper function to safely access nested properties
function safeGetMetadataValue<T>(obj: any, path: string[], defaultValue: T): T {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  let current = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return (current as unknown) as T;
}

export const useDriverData = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<ShipmentWithProfiles[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<ShipmentWithProfiles[]>([]);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [scheduleShipments, setScheduleShipments] = useState<Record<string, ShipmentWithProfiles[]>>({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const pendingCollections = activeDeliveries.filter(shipment => 
    ['Booking Confirmed', 'Ready for Pickup'].includes(shipment.status)
  );
  
  const inTransitDeliveries = activeDeliveries.filter(shipment => 
    ['Processing in Warehouse (UK)', 'Customs Clearance', 'Processing in Warehouse (ZW)', 'In Transit', 'Out for Delivery'].includes(shipment.status)
  );

  const fetchDriverData = async () => {
    try {
      setLoading(true);

      const [activeDeliveriesRes, completedDeliveriesRes, scheduleRes] = await Promise.all([
        supabase
          .from('shipments')
          .select('*')
          .in('status', [
            'Booking Confirmed',
            'Ready for Pickup',
            'Processing in Warehouse (UK)',
            'Customs Clearance',
            'Processing in Warehouse (ZW)',
            'In Transit',
            'Out for Delivery',
          ])
          .eq('can_modify', false),

        supabase
          .from('shipments')
          .select('*')
          .eq('status', 'Delivered')
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('collection_schedules')
          .select('*')
          .order('pickup_date', { ascending: true }),
      ]);

      if (activeDeliveriesRes.error) throw activeDeliveriesRes.error;
      if (completedDeliveriesRes.error) throw completedDeliveriesRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

      const enrichShipments = async (shipments: any[]): Promise<ShipmentWithProfiles[]> => {
        const userFetches = shipments.map(async (shipment) => {
          // Create a properly typed shipment object with safe metadata handling
          const typedShipment: ShipmentWithProfiles = {
            id: shipment.id,
            tracking_number: shipment.tracking_number,
            status: shipment.status,
            origin: shipment.origin,
            destination: shipment.destination,
            user_id: shipment.user_id,
            created_at: shipment.created_at,
            updated_at: shipment.updated_at,
            metadata: isValidMetadata(shipment.metadata) ? shipment.metadata : {},
            can_cancel: shipment.can_cancel,
            can_modify: shipment.can_modify,
            profiles: undefined
          };

          if (shipment.user_id) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', shipment.user_id)
              .single();
            if (userData) typedShipment.profiles = userData;
          }
          return typedShipment;
        });
        return await Promise.all(userFetches);
      };

      const [enrichedActive, enrichedCompleted] = await Promise.all([
        enrichShipments(activeDeliveriesRes.data || []),
        enrichShipments(completedDeliveriesRes.data || []),
      ]);

      setActiveDeliveries(enrichedActive);
      setCompletedDeliveries(enrichedCompleted);
      setCollectionSchedules(scheduleRes.data || []);

      const schedulesWithShipments: Record<string, ShipmentWithProfiles[]> = {};

      for (const schedule of scheduleRes.data || []) {
        const { data: shipments, error } = await supabase
          .from('shipments')
          .select('*')
          .in('status', ['Booking Confirmed', 'Ready for Pickup'])
          .eq('can_modify', false)
          .contains('metadata', { pickup_date: schedule.pickup_date });

        if (error) continue;
        schedulesWithShipments[schedule.id] = shipments?.length
          ? await enrichShipments(shipments)
          : [];
      }

      setScheduleShipments(schedulesWithShipments);
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDriverData();
      toast({ title: 'Data refreshed', description: 'Driver data has been updated' });
    } catch (error: any) {
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    loading,
    isRefreshing,
    activeDeliveries,
    completedDeliveries,
    collectionSchedules,
    scheduleShipments,
    pendingCollections,
    inTransitDeliveries,
    handleRefresh,
    fetchDriverData
  };
};
