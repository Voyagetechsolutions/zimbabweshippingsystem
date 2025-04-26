
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UKCollectionsTab from './UKCollectionsTab';
import ZimbabweDeliveriesTab from './ZimbabweDeliveriesTab';
import SchedulesTab from './SchedulesTab';
import StatsCards from './StatsCards';
import { useToast } from '@/hooks/use-toast';

const DriverDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [pendingCollections, setPendingCollections] = useState([]);
  const [inTransitDeliveries, setInTransitDeliveries] = useState([]);
  const [collectionSchedules, setCollectionSchedules] = useState([]);
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const { toast } = useToast();

  const fetchShipments = async () => {
    try {
      // Fetch pending collections
      const { data: collections, error: collectionsError } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'pending_collection');

      if (collectionsError) throw collectionsError;

      // Fetch in-transit deliveries
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'in_transit');

      if (deliveriesError) throw deliveriesError;

      setPendingCollections(collections || []);
      setInTransitDeliveries(deliveries || []);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch shipments',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchShipments();
    const subscription = supabase
      .channel('shipments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
        fetchShipments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Shipment status updated successfully',
      });

      fetchShipments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipment status',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <StatsCards 
        collectionsCount={pendingCollections.length}
        deliveriesCount={inTransitDeliveries.length}
        schedulesCount={collectionSchedules.length}
      />
      
      <Tabs defaultValue="collections" className="w-full">
        <TabsList>
          <TabsTrigger value="collections">UK Collections</TabsTrigger>
          <TabsTrigger value="deliveries">Zimbabwe Deliveries</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <UKCollectionsTab
            loading={loading}
            pendingCollections={pendingCollections}
            onStatusUpdate={handleStatusUpdate}
          />
        </TabsContent>

        <TabsContent value="deliveries">
          <ZimbabweDeliveriesTab
            loading={loading}
            inTransitDeliveries={inTransitDeliveries}
            onStatusUpdate={handleStatusUpdate}
          />
        </TabsContent>

        <TabsContent value="schedules">
          <SchedulesTab
            loading={loading}
            collectionSchedules={collectionSchedules}
            scheduleShipments={{}}
            expandedSchedule={expandedSchedule}
            onToggleDetails={setExpandedSchedule}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverDashboard;
