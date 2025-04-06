import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  TruckIcon, CheckCircle2, MapPin, Calendar, Clock, Phone, User, Package,
  Truck, AlertTriangle, ArrowRightCircle, Filter, Camera, Upload, ChevronDown
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  }, []);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      
      // Fetch active deliveries - include statuses based on new status options
      const { data: activeData, error: activeError } = await supabase
        .from('shipments')
        .select('*')
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
      setActiveDeliveries(activeData || []);
      
      // Fetch completed deliveries
      const { data: completedData, error: completedError } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'Delivered')
        .order('created_at', { ascending: false })
        .limit(5);

      if (completedError) throw completedError;
      setCompletedDeliveries(completedData || []);

      // Fetch collection schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (scheduleError) throw scheduleError;
      setCollectionSchedules(scheduleData || []);
      
      // Fetch shipments for each schedule
      if (scheduleData && scheduleData.length > 0) {
        const schedulesWithShipments: {[key: string]: any[]} = {};
        
        for (const schedule of scheduleData) {
          const { data: shipmentData, error: shipmentError } = await supabase
            .from('shipments')
            .select('*')
            .in('status', ['Booking Confirmed', 'Ready for Pickup'])
            .eq('can_modify', false) // Only confirmed bookings
            .contains('metadata', { pickup_date: schedule.pickup_date });
            
          if (!shipmentError) {
            schedulesWithShipments[schedule.id] = shipmentData || [];
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
      
      fetchDriverData(); // Refresh data
      
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
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
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          metadata: { 
            ...activeDeliveries.find(d => d.id === currentShipmentId)?.metadata,
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
      setCurrentShipmentId('');
      
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

  const openImageUploadModal = (shipmentId: string) => {
    setCurrentShipmentId(shipmentId);
    setShowImageUpload(true);
  };

  const getDeliveryAddress = (shipment: any) => {
    if (shipment.metadata && typeof shipment.metadata === 'object') {
      const pickup_area = shipment.metadata.pickup_area;
      return pickup_area ? pickup_area : shipment.destination;
    }
    return shipment.destination;
  };

  const getRecipientInfo = (shipment: any) => {
    if (shipment.metadata && typeof shipment.metadata === 'object') {
      const name = shipment.metadata.recipient_name;
      const phone = shipment.metadata.recipient_phone;
      
      if (name && phone) {
        return { name, phone };
      }
    }
    return { name: 'Not specified', phone: 'Not specified' };
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const toggleScheduleDetails = (scheduleId: string) => {
    if (expandedSchedule === scheduleId) {
      setExpandedSchedule(null);
    } else {
      setExpandedSchedule(scheduleId);
    }
  };

  const pendingCollections = activeDeliveries.filter(d => 
    d.status === 'Ready for Pickup'
  );
  
  const inTransitDeliveries = activeDeliveries.filter(d => 
    ['In Transit', 'Out for Delivery', 'Customs Clearance', 'Processing in Warehouse (ZW)'].includes(d.status)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between pb-2 ${isMobile ? 'space-y-0' : ''}`}>
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Collections
            </CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCollections.length}</div>
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
            <div className="text-2xl font-bold">{inTransitDeliveries.length}</div>
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
            <div className="text-2xl font-bold">{completedDeliveries.length}</div>
            <p className="text-xs text-gray-500">Recently delivered</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="uk-collections" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="uk-collections">UK Collections</TabsTrigger>
          <TabsTrigger value="zim-deliveries">Zimbabwe Deliveries</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
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
              {pendingCollections.map((shipment) => {
                const recipientInfo = getRecipientInfo(shipment);
                return (
                  <Card key={shipment.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 border-b">
                        <div className="flex justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-medium text-base md:text-lg flex items-center">
                              <Package className="h-4 w-4 mr-2 text-zim-green" />
                              Collection #{shipment.tracking_number}
                            </h3>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="truncate max-w-[180px] md:max-w-none">{getDeliveryAddress(shipment)}</span>
                            </div>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            {shipment.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-700">{recipientInfo.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-700">{recipientInfo.phone}</span>
                            </div>
                          </div>
                          <div className="flex items-end justify-start md:justify-end mt-4 md:mt-0">
                            <Button 
                              onClick={() => handleUpdateStatus(shipment.id, 'Processing in Warehouse (UK)')}
                              className="bg-zim-green hover:bg-zim-green/90 flex w-full md:w-auto justify-center"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              <span>Mark as Collected</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-500 mb-1">No collections pending</h3>
              <p className="text-sm text-gray-500">
                There are no confirmed packages ready for collection at the moment.
              </p>
            </div>
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
              {inTransitDeliveries.map((shipment) => {
                const recipientInfo = getRecipientInfo(shipment);
                return (
                  <Card key={shipment.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 border-b">
                        <div className="flex justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-medium text-base md:text-lg flex items-center">
                              <Truck className="h-4 w-4 mr-2 text-blue-500" />
                              Delivery #{shipment.tracking_number}
                            </h3>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="truncate max-w-[180px] md:max-w-none">{getDeliveryAddress(shipment)}</span>
                            </div>
                          </div>
                          <Badge className={
                            shipment.status === 'In Transit' ? "bg-blue-100 text-blue-800 border-blue-300" :
                            shipment.status === 'Out for Delivery' ? "bg-indigo-100 text-indigo-800 border-indigo-300" :
                            shipment.status === 'Customs Clearance' ? "bg-purple-100 text-purple-800 border-purple-300" :
                            "bg-orange-100 text-orange-800 border-orange-300"
                          }>
                            {shipment.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-700">{recipientInfo.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-700">{recipientInfo.phone}</span>
                            </div>
                          </div>
                          <div className="flex items-end justify-start md:justify-end mt-4 md:mt-0 space-x-2">
                            {shipment.status === 'In Transit' ? (
                              <Button 
                                onClick={() => handleUpdateStatus(shipment.id, 'Out for Delivery')}
                                className="bg-blue-500 hover:bg-blue-600 flex w-full md:w-auto justify-center"
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                <span>Mark Out for Delivery</span>
                              </Button>
                            ) : shipment.status === 'Out for Delivery' ? (
                              <Button 
                                onClick={() => openImageUploadModal(shipment.id)}
                                className="bg-green-500 hover:bg-green-600 flex w-full md:w-auto justify-center"
                              >
                                <Camera className="h-4 w-4 mr-2" />
                                <span>Upload Delivery Photo</span>
                              </Button>
                            ) : shipment.status === 'Customs Clearance' ? (
                              <Button 
                                onClick={() => handleUpdateStatus(shipment.id, 'Processing in Warehouse (ZW)')}
                                className="bg-purple-500 hover:bg-purple-600 flex w-full md:w-auto justify-center"
                              >
                                <Package className="h-4 w-4 mr-2" />
                                <span>Mark as Processing in Zimbabwe</span>
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleUpdateStatus(shipment.id, 'Out for Delivery')}
                                className="bg-orange-500 hover:bg-orange-600 flex w-full md:w-auto justify-center"
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                <span>Mark Out for Delivery</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Truck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-500 mb-1">No deliveries pending</h3>
              <p className="text-sm text-gray-500">
                There are no packages to be delivered at the moment.
              </p>
            </div>
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
                <Card key={schedule.id} className="overflow-hidden">
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
                          onClick={() => toggleScheduleDetails(schedule.id)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          <span>View Shipments ({scheduleShipments[schedule.id]?.length || 0})</span>
                          <ChevronDown className={`h-4 w-4 ml-2 transform ${expandedSchedule === schedule.id ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    <Collapsible open={expandedSchedule === schedule.id} className="mt-4">
                      <CollapsibleContent>
                        {scheduleShipments[schedule.id] && scheduleShipments[schedule.id].length > 0 ? (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-2">Scheduled Shipments</h4>
                            <div className="space-y-2">
                              {scheduleShipments[schedule.id].map((shipment: any) => (
                                <div key={shipment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                  <div>
                                    <p className="font-medium">{shipment.tracking_number}</p>
                                    <p className="text-xs text-gray-500">{getDeliveryAddress(shipment)}</p>
                                  </div>
                                  <Badge className={
                                    shipment.status === 'Ready for Pickup' ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                                    shipment.status === 'Paid' ? "bg-green-100 text-green-800 border-green-300" :
                                    shipment.status === 'Booked' ? "bg-blue-100 text-blue-800 border-blue-300" :
                                    "bg-orange-100 text-orange-800 border-orange-300"
                                  }>
                                    {shipment.status}
                                  </Badge>
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
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-500 mb-1">No schedules available</h3>
              <p className="text-sm text-gray-500">
                There are no collection schedules at the moment.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Delivery Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="max-h-60 rounded-md" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    &times;
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-12 text-center">
                  <Camera className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Click to take or upload a photo</p>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="delivery-photo" className="sr-only">Delivery Photo</Label>
              <Input
                id="delivery-photo"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={imagePreview ? "hidden" : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowImageUpload(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadDeliveryImage}
              disabled={!imageFile || uploadLoading}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              {uploadLoading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Mark Delivered
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
