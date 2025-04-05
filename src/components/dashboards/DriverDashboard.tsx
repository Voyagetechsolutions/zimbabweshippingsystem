
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  TruckIcon, CheckCircle2, MapPin, Calendar, Clock, Phone, User, Package,
  Truck, AlertTriangle, ArrowRightCircle, Filter
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const DriverDashboard = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      
      // Fetch active deliveries
      const { data: activeData, error: activeError } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Ready for Pickup', 'In Transit', 'Out for Delivery'])
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
            <div className="text-2xl font-bold">{activeDeliveries.filter(d => d.status === 'Ready for Pickup').length}</div>
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
            <div className="text-2xl font-bold">{activeDeliveries.filter(d => d.status === 'In Transit').length}</div>
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
          ) : activeDeliveries.filter(d => d.status === 'Ready for Pickup').length > 0 ? (
            <div className="space-y-4">
              {activeDeliveries
                .filter(d => d.status === 'Ready for Pickup')
                .map((shipment) => {
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
                              Ready for Pickup
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
                                onClick={() => handleUpdateStatus(shipment.id, 'In Transit')}
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
                There are no packages ready for collection at the moment.
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
          ) : activeDeliveries.filter(d => d.status === 'Out for Delivery').length > 0 ? (
            <div className="space-y-4">
              {activeDeliveries
                .filter(d => d.status === 'Out for Delivery')
                .map((shipment) => {
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
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                              Out for Delivery
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
                                onClick={() => handleUpdateStatus(shipment.id, 'Delivered')}
                                className="bg-zim-green hover:bg-zim-green/90 flex w-full md:w-auto justify-center"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                <span>Mark as Delivered</span>
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
              {collectionSchedules.map((schedule, index) => (
                <Card key={index} className="overflow-hidden">
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
                      <Button variant="outline" className="flex items-center mt-2 md:mt-0 w-full md:w-auto justify-center">
                        <ArrowRightCircle className="h-4 w-4 mr-2" />
                        <span>View Route</span>
                      </Button>
                    </div>
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
    </div>
  );
};

export default DriverDashboard;
