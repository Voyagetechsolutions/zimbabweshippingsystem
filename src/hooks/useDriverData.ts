import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment, ShipmentMetadata } from '@/types/shipment';

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
  const [activeDeliveries, setActiveDeliveries] = useState<Shipment[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<Shipment[]>([]);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [scheduleShipments, setScheduleShipments] = useState<Record<string, Shipment[]>>({});
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
      console.log("Fetching driver data...");

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

      console.log(`Got ${activeDeliveriesRes.data?.length || 0} active deliveries`);
      console.log(`Got ${completedDeliveriesRes.data?.length || 0} completed deliveries`);

      const enrichShipments = async (shipments: any[]): Promise<Shipment[]> => {
        const enrichedShipments: Shipment[] = [];
        
        for (const shipment of shipments) {
          // Create a properly typed shipment object with safe metadata handling
          const typedShipment: Shipment = {
            id: shipment.id,
            tracking_number: shipment.tracking_number,
            status: shipment.status,
            origin: shipment.origin,
            destination: shipment.destination,
            user_id: shipment.user_id,
            created_at: shipment.created_at,
            updated_at: shipment.updated_at,
            metadata: isValidMetadata(shipment.metadata) ? shipment.metadata : {},
            can_cancel: shipment.can_cancel !== undefined ? shipment.can_cancel : true,
            can_modify: shipment.can_modify !== undefined ? shipment.can_modify : true,
          };

          if (shipment.user_id) {
            try {
              const { data: userData, error } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', shipment.user_id)
                .single();
              
              if (!error && userData) {
                typedShipment.profiles = {
                  email: userData.email,
                  full_name: userData.full_name
                };
                console.log(`Found user data for ${shipment.id}: ${userData.email}`);
              } else {
                console.log(`No user data found for ID ${shipment.user_id}`);
              }
            } catch (err) {
              console.error("Error fetching user data:", err);
            }
          }
          
          enrichedShipments.push(typedShipment);
        }
        
        return enrichedShipments;
      };

      const [enrichedActive, enrichedCompleted] = await Promise.all([
        enrichShipments(activeDeliveriesRes.data || []),
        enrichShipments(completedDeliveriesRes.data || []),
      ]);

      setActiveDeliveries(enrichedActive);
      setCompletedDeliveries(enrichedCompleted);
      setCollectionSchedules(scheduleRes.data || []);

      const schedulesWithShipments: Record<string, Shipment[]> = {};

      for (const schedule of scheduleRes.data || []) {
        const { data: shipments, error } = await supabase
          .from('shipments')
          .select('*')
          .in('status', ['Booking Confirmed', 'Ready for Pickup'])
          .eq('can_modify', false)
          .contains('metadata', { pickup_date: schedule.pickup_date });

        if (error) {
          console.error("Error fetching shipments for schedule:", error);
          continue;
        }
        
        schedulesWithShipments[schedule.id] = shipments?.length
          ? await enrichShipments(shipments)
          : [];
      }

      setScheduleShipments(schedulesWithShipments);
      console.log("Driver data fetch complete");
    } catch (error: any) {
      console.error("Error in fetchDriverData:", error);
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
