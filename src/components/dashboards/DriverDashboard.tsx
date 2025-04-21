
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Package, Truck, Calendar, AlertTriangle } from 'lucide-react';

// Import our components
import StatsCards from './driver/StatsCards';
import DeliveryCard from './driver/DeliveryCard';
import ScheduleCard from './driver/ScheduleCard';
import ImageUploadDialog from './driver/ImageUploadDialog';
import EmptyState from './driver/EmptyState';

const DriverDashboard = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [scheduleShipments, setScheduleShipments] = useState<{[key: string]: any[]}>({});
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [currentShipmentId, setCurrentShipmentId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDriverData();
    
    // Set up a periodic refresh interval
    const refreshInterval = setInterval(() => {
      fetchDriverData();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      
      // Fetch active deliveries - include all active statuses
      const { data: activeData, error: activeError } = await supabase
        .from('shipments')
        .select(`
          *,
          profiles:user_id(
            email,
            full_name
          )
        `)
        .in('status', [
          'Booking Confirmed', 
          'Ready for Pickup', 
          'Processing in Warehouse (UK)', 
          'Customs Clearance', 
          'Processing in Warehouse (ZW)', 
          'In Transit', 
          'Out for Delivery'
        ])
        .eq('can_modify', false) // Only confirmed bookings
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      console.log("Active deliveries fetched:", activeData?.length);
      setActiveDeliveries(activeData || []);
      
      // Fetch completed deliveries
      const { data: completedData, error: completedError } = await supabase
        .from('shipments')
        .select(`
          *,
          profiles:user_id(
            email,
            full_name
          )
        `)
        .eq('status', 'Delivered')
        .order('created_at', { ascending: false })
        .limit(10);

      if (completedError) throw completedError;
      console.log("Completed deliveries fetched:", completedData?.length);
      setCompletedDeliveries(completedData || []);

      // Fetch collection schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (scheduleError) throw scheduleError;
      setCollectionSchedules(scheduleData || []);
      console.log("Collection schedules fetched:", scheduleData?.length);
      
      // Fetch shipments for each schedule
      if (scheduleData && scheduleData.length > 0) {
        const schedulesWithShipments: {[key: string]: any[]} = {};
        
        for (const schedule of scheduleData) {
          const { data: shipmentData, error: shipmentError } = await supabase
            .from('shipments')
            .select(`
              *,
              profiles:user_id(
                email,
                full_name
              )
            `)
            .in('status', ['Booking Confirmed', 'Ready for Pickup'])
            .eq('can_modify', false) // Only confirmed bookings
            .contains('metadata', { pickup_date: schedule.pickup_date });
            
          if (!shipmentError) {
            schedulesWithShipments[schedule.id] = shipmentData || [];
            console.log(`Schedule ${schedule.id} has ${shipmentData?.length || 0} shipments`);
          }
        }
        
        setScheduleShipments(schedulesWithShipments);
      }
      
    } catch (error: any) {
      console.error('Error fetching driver data:', error.message);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Status Updated',
        description: `Shipment status updated to ${newStatus}`,
      });
      
      // Refresh data after status update
      fetchDriverData();
      
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const openImageUploadModal = (shipmentId: string) => {
    setCurrentShipmentId(shipmentId);
    setShowImageUpload(true);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };

  const handleImageClear = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCloseImageUpload = () => {
    setShowImageUpload(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleUploadDeliveryImage = async () => {
    if (!imageFile || !currentShipmentId) return;
    
    try {
      setUploadLoading(true);
      
      // Upload the image to storage
      const fileName = `delivery-${currentShipmentId}-${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`deliveries/${fileName}`, imageFile);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('images')
        .getPublicUrl(`deliveries/${fileName}`);
        
      // Update the shipment with the image URL
      const currentShipment = activeDeliveries.find(d => d.id === currentShipmentId);
      const currentMetadata = currentShipment?.metadata || {};
      
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          metadata: { 
            ...currentMetadata,
            delivery_image: urlData.publicUrl 
          }
        })
        .eq('id', currentShipmentId);
        
      if (updateError) throw updateError;
      
      toast({
        title: 'Image Uploaded',
        description: 'Delivery image has been successfully uploaded',
      });
      
      // Close modal and reset state
      setShowImageUpload(false);
      setImageFile(null);
      setImagePreview(null);
      
      // Update the shipment status to Delivered
      await handleUpdateStatus(currentShipmentId, 'Delivered');
      
    } catch (error: any) {
      toast({
        title: 'Error uploading image',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const toggleScheduleDetails = (scheduleId: string) => {
    if (expandedSchedule === scheduleId) {
      setExpandedSchedule(null);
    } else {
      setExpandedSchedule(scheduleId);
    }
  };
  
  // Filter for pending collections (Ready for Pickup status only)
  const pendingCollections = activeDeliveries.filter(d => 
    d.status === 'Ready for Pickup'
  );
  
  // Filter for in-transit deliveries (all delivery-related statuses)
  const inTransitDeliveries = activeDeliveries.filter(d => 
    ['In Transit', 'Out for Delivery', 'Customs Clearance', 'Processing in Warehouse (ZW)'].includes(d.status)
  );

  // Total number of shipments for all schedules
  const totalScheduledShipments = Object.values(scheduleShipments).reduce(
    (total, shipments) => total + shipments.length, 0
  );

  return (
    <div className="space-y-6">
      <StatsCards 
        pendingCount={pendingCollections.length}
        inTransitCount={inTransitDeliveries.length}
        completedCount={completedDeliveries.length}
        isMobile={isMobile}
      />
      
      <Tabs defaultValue="uk-collections" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="uk-collections">UK Collections</TabsTrigger>
          <TabsTrigger value="zim-deliveries">Zimbabwe Deliveries</TabsTrigger>
          <TabsTrigger value="schedules">
            Schedules
            {totalScheduledShipments > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
                {totalScheduledShipments}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="uk-collections" className="space-y-4">
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
                  onStatusUpdate={handleUpdateStatus}
                  onUploadImage={openImageUploadModal}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Package className="h-12 w-12 text-gray-300" />}
              title="No collections pending"
              description="There are no confirmed packages ready for collection at the moment."
            />
          )}
        </TabsContent>
        
        <TabsContent value="zim-deliveries" className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
            <div className="flex items-start">
              <Truck className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">Delivery Instructions</h3>
                <p className="text-sm text-blue-700">
                  Take photos of all delivered packages as proof of delivery. Get recipient signatures when possible.
                </p>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : inTransitDeliveries.length > 0 ? (
            <div className="space-y-4">
              {inTransitDeliveries.map((shipment) => (
                <DeliveryCard
                  key={shipment.id}
                  shipment={shipment}
                  type="delivery"
                  onStatusUpdate={handleUpdateStatus}
                  onUploadImage={openImageUploadModal}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Truck className="h-12 w-12 text-gray-300" />}
              title="No deliveries pending"
              description="There are no packages to be delivered at the moment."
            />
          )}
        </TabsContent>
        
        <TabsContent value="schedules" className="space-y-4">
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
                  onToggleDetails={toggleScheduleDetails}
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
        </TabsContent>
      </Tabs>
      
      <ImageUploadDialog
        isOpen={showImageUpload}
        onClose={handleCloseImageUpload}
        imagePreview={imagePreview}
        isUploading={uploadLoading}
        onImageChange={handleImageChange}
        onImageClear={handleImageClear}
        onUpload={handleUploadDeliveryImage}
      />
    </div>
  );
};

export default DriverDashboard;
