import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Package, Truck, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Shipment } from '@/types/shipment';

import StatsCards from './driver/StatsCards';
import DeliveryCard from './driver/DeliveryCard';
import ScheduleCard from './driver/ScheduleCard';
import ImageUploadDialog from './driver/ImageUploadDialog';
import EmptyState from './driver/EmptyState';

const DriverDashboard = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<Shipment[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<Shipment[]>([]);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [scheduleShipments, setScheduleShipments] = useState<Record<string, Shipment[]>>({});
  const [loading, setLoading] = useState(true);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [currentShipmentId, setCurrentShipmentId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 60000);
    return () => clearInterval(interval);
  }, []);

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

      const enrichShipments = async (shipments: Shipment[]) => {
        const userFetches = shipments.map(async (shipment) => {
          if (shipment.user_id) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', shipment.user_id)
              .single();
            if (userData) shipment.profiles = userData;
          }
          return shipment;
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

      const schedulesWithShipments: Record<string, Shipment[]> = {};

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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Status Updated', description: `Shipment updated to ${newStatus}` });
      await fetchDriverData();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
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
      setImagePreview(URL.createObjectURL(file));
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
      const fileName = `delivery-${currentShipmentId}-${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`deliveries/${fileName}`, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('images')
        .getPublicUrl(`deliveries/${fileName}`);

      const shipment = activeDeliveries.find((s) => s.id === currentShipmentId);
      const metadata = typeof shipment?.metadata === 'object' ? { ...shipment.metadata } : {};

      const { error: updateError } = await supabase
        .from('shipments')
        .update({ metadata: { ...metadata, delivery_image: urlData.publicUrl } })
        .eq('id', currentShipmentId);

      if (updateError) throw updateError;

      toast({ title: 'Image Uploaded', description: 'Delivery image uploaded successfully' });

      handleCloseImageUpload();
      await handleUpdateStatus(currentShipmentId, 'Delivered');
    } catch (error: any) {
      toast({
        title: 'Error uploading image',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <StatsCards 
          pendingCount={pendingCollections.length}
          inTransitCount={inTransitDeliveries.length}
          completedCount={completedDeliveries.length}
          isMobile={isMobile}
        />
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isRefreshing || loading}
          size="sm"
          className="ml-auto hidden md:flex"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
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
          
          <div className="flex md:hidden justify-end mb-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={isRefreshing || loading}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
