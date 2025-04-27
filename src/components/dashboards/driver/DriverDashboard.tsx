import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, PackageCheck, Truck, Calendar } from 'lucide-react';
import StatsCards from './StatsCards';
import UKCollectionsTab from './UKCollectionsTab';
import ZimbabweDeliveriesTab from './ZimbabweDeliveriesTab';
import SchedulesTab from './SchedulesTab';
import { Shipment } from '@/types/shipment';

const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingCollections, setPendingCollections] = useState<any[]>([]);
  const [inTransitDeliveries, setInTransitDeliveries] = useState<any[]>([]);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [scheduleShipments, setScheduleShipments] = useState<Record<string, Shipment[]>>({});
  const [collectionsCount, setCollectionsCount] = useState(0);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [schedulesCount, setSchedulesCount] = useState(0);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentShipmentId, setCurrentShipmentId] = useState<string | null>(null);

  const checkMobileView = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  useEffect(() => {
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        console.error('User not available');
        return;
      }

      const userId = user.id;

      // Fetch pending collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'pending_collection')
        .like('metadata->>customer_name', `%${user.user_metadata.full_name}%`);

      if (collectionsError) {
        console.error('Error fetching pending collections:', collectionsError);
        toast({
          title: 'Error',
          description: 'Failed to fetch pending collections.',
          variant: 'destructive',
        });
      } else {
        setPendingCollections(collectionsData || []);
        setCollectionsCount(collectionsData?.length || 0);
      }

      // Fetch in-transit deliveries
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'in_transit')
        .like('metadata->>customer_name', `%${user.user_metadata.full_name}%`);

      if (deliveriesError) {
        console.error('Error fetching in-transit deliveries:', deliveriesError);
        toast({
          title: 'Error',
          description: 'Failed to fetch in-transit deliveries.',
          variant: 'destructive',
        });
      } else {
        setInTransitDeliveries(deliveriesData || []);
        setDeliveriesCount(deliveriesData?.length || 0);
      }

      // Fetch collection schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('collection_schedules')
        .select('*')
        .eq('driver_id', userId);

      if (schedulesError) {
        console.error('Error fetching collection schedules:', schedulesError);
        toast({
          title: 'Error',
          description: 'Failed to fetch collection schedules.',
          variant: 'destructive',
        });
      } else {
        setCollectionSchedules(schedulesData || []);
        setSchedulesCount(schedulesData?.length || 0);

        // Fetch shipments for each schedule
        const shipmentsBySchedule: Record<string, Shipment[]> = {};
        if (schedulesData) {
          for (const schedule of schedulesData) {
            const { data: shipments, error: shipmentError } = await supabase
              .from('shipments')
              .select('*')
              .eq('collection_schedule_id', schedule.id);

            if (shipmentError) {
              console.error(`Error fetching shipments for schedule ${schedule.id}:`, shipmentError);
            } else {
              shipmentsBySchedule[schedule.id] = shipments || [];
            }
          }
        }
        setScheduleShipments(shipmentsBySchedule);
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update status.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Status Updated',
          description: `Shipment status updated to ${newStatus}.`,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleDetails = (id: string) => {
    setExpandedSchedule(expandedSchedule === id ? null : id);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleImageUpload = async (id: string, imageUrl: string) => {
    setCurrentShipmentId(id);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedImage(file);
        uploadImage(id, file);
      }
    };
    fileInput.click();
  };

  const uploadImage = async (id: string, file: File) => {
    setUploading(true);
    try {
      const fileName = `shipment_${id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('shipment-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Upload Error',
          description: 'Failed to upload image.',
          variant: 'destructive',
        });
      } else {
        const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shipment-images/${data.path}`;
        await updateShipmentWithImage(id, imageUrl);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setSelectedImage(null);
      setCurrentShipmentId(null);
    }
  };

  const updateShipmentWithImage = async (id: string, imageUrl: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ delivery_image: imageUrl })
        .eq('id', id);

      if (error) {
        console.error('Error updating shipment with image:', error);
        toast({
          title: 'Update Error',
          description: 'Failed to update shipment with image.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Image Uploaded',
          description: 'Shipment image uploaded successfully.',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Update failed:', err);
      toast({
        title: 'Update Error',
        description: 'Failed to update shipment with image.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Driver Dashboard</h1>
      
      <StatsCards 
        pendingCount={0}
        inTransitCount={0}
        completedCount={0}
        collectionsCount={collectionsCount}
        deliveriesCount={deliveriesCount}
        schedulesCount={schedulesCount}
        isMobile={isMobile}
      />

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Collections</h2>
        <UKCollectionsTab 
          loading={loading}
          pendingCollections={pendingCollections}
          onStatusUpdate={handleStatusUpdate}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onUploadImage={handleImageUpload}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Deliveries</h2>
        <ZimbabweDeliveriesTab 
          loading={loading}
          inTransitDeliveries={inTransitDeliveries}
          onStatusUpdate={handleStatusUpdate}
          onUploadImage={handleImageUpload}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Schedules</h2>
        <SchedulesTab
          loading={loading}
          collectionSchedules={collectionSchedules}
          scheduleShipments={scheduleShipments}
          expandedSchedule={expandedSchedule}
          onToggleDetails={handleToggleDetails}
        />
      </div>
    </div>
  );
};

export default DriverDashboard;
