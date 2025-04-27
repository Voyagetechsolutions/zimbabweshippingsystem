
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useDriverData } from '@/hooks/useDriverData';
import StatsCards from './driver/StatsCards';
import ImageUploadDialog from './driver/ImageUploadDialog';
import UKCollectionsTab from './driver/UKCollectionsTab';
import ZimbabweDeliveriesTab from './driver/ZimbabweDeliveriesTab';
import SchedulesTab from './driver/SchedulesTab';

const DriverDashboard = () => {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [currentShipmentId, setCurrentShipmentId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const {
    loading,
    isRefreshing,
    pendingCollections,
    inTransitDeliveries,
    completedDeliveries,
    collectionSchedules,
    scheduleShipments,
    handleRefresh,
    fetchDriverData
  } = useDriverData();

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

      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          metadata: { 
            ...pendingCollections.find(s => s.id === currentShipmentId)?.metadata, 
            delivery_image: urlData.publicUrl 
          },
          status: 'Delivered'
        })
        .eq('id', currentShipmentId);

      if (updateError) throw updateError;

      toast({ title: 'Image Uploaded', description: 'Delivery image uploaded successfully' });
      handleCloseImageUpload();
      await fetchDriverData();
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

  const toggleScheduleDetails = (id: string) => {
    setExpandedSchedule(expandedSchedule === id ? null : id);
  };

  const totalScheduledShipments = Object.values(scheduleShipments).reduce(
    (total, shipments) => total + shipments.length, 
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <StatsCards 
          pendingCount={pendingCollections.length}
          inTransitCount={inTransitDeliveries.length}
          completedCount={completedDeliveries.length}
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
        
        <TabsContent value="uk-collections">
          <UKCollectionsTab
            loading={loading}
            isRefreshing={isRefreshing}
            pendingCollections={pendingCollections}
            onRefresh={handleRefresh}
            onStatusUpdate={handleUpdateStatus}
            onUploadImage={openImageUploadModal}
          />
        </TabsContent>
        
        <TabsContent value="zim-deliveries">
          <ZimbabweDeliveriesTab
            loading={loading}
            inTransitDeliveries={inTransitDeliveries}
            onStatusUpdate={handleUpdateStatus}
            onUploadImage={openImageUploadModal}
          />
        </TabsContent>
        
        <TabsContent value="schedules">
          <SchedulesTab
            loading={loading}
            collectionSchedules={collectionSchedules}
            scheduleShipments={scheduleShipments}
            expandedSchedule={expandedSchedule}
            onToggleDetails={toggleScheduleDetails}
          />
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
