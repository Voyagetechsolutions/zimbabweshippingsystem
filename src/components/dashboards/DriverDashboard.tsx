
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Calendar, Clock, Package, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  getRouteNames, 
  getAreasByRoute, 
  getDateByRoute 
} from '@/data/collectionSchedule';

const DriverDashboard = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assigned: 0,
    completed: 0,
    pending: 0
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) {
      fetchDriverTasks();
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setSchedules(data);
      }
    } catch (error: any) {
      console.error('Error fetching collection schedules:', error);
      toast({
        title: 'Error fetching schedules',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getTodayCollection = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    if (dayOfWeek === 1) { // Monday
      return {
        route: "Northampton Route",
        areas: getAreasByRoute("Northampton Route"),
        date: getDateByRoute("Northampton Route")
      };
    } else if (dayOfWeek === 4) { // Thursday
      return {
        route: "London Route",
        areas: getAreasByRoute("London Route"),
        date: getDateByRoute("London Route")
      };
    }
    
    return null;
  };
  
  const todayCollection = getTodayCollection();

  const fetchDriverTasks = async () => {
    try {
      setLoading(true);
      
      // Get collections for today based on the schedule
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Booked', 'Paid', 'In Transit'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Filter into collections (UK) and deliveries (international)
        const collectionsData = data.filter(item => 
          item.origin?.toLowerCase().includes('uk') || 
          item.origin?.toLowerCase().includes('united kingdom')
        );
        
        const deliveriesData = data.filter(item => 
          item.destination?.toLowerCase().includes('zimbabwe')
        );
        
        // If we have today's collection route, filter for only those areas
        if (todayCollection) {
          const todayAreas = todayCollection.areas;
          const todayCollections = collectionsData.filter(item => {
            const metadata = item.metadata || {};
            // Fix: Safely access pickup_area from metadata
            const pickupArea = typeof metadata === 'object' && metadata !== null 
              ? (metadata as Record<string, any>).pickup_area || ''
              : '';
            return todayAreas.includes(pickupArea);
          });
          
          setCollections(todayCollections);
        } else {
          setCollections(collectionsData);
        }
        
        setDeliveries(deliveriesData);
        
        setStats({
          assigned: data.length,
          completed: data.filter(item => item.status === 'Delivered').length,
          pending: data.filter(item => item.status !== 'Delivered').length
        });
      }
    } catch (error: any) {
      console.error('Error fetching driver tasks:', error);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Progress for today's tasks
  const todayProgress = Math.round((stats.completed / (stats.assigned || 1)) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Tasks
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
            <div className="mt-4">
              <Progress value={todayProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {todayProgress}% completed
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats.assigned} assigned tasks
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Tasks
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Tasks yet to be completed
            </p>
          </CardContent>
        </Card>
      </div>

      {todayCollection && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm md:text-base">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Today's Collection Route: {todayCollection.route}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              Date: {todayCollection.date}
            </p>
            <div className="flex flex-wrap gap-2">
              {todayCollection.areas.map((area: string, index: number) => (
                <Badge key={index} variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto mb-4">
          <TabsTrigger value="collections" className="py-2 text-xs md:text-sm">UK Collections</TabsTrigger>
          <TabsTrigger value="deliveries" className="py-2 text-xs md:text-sm">Zimbabwe Deliveries</TabsTrigger>
          <TabsTrigger value="schedule" className="py-2 text-xs md:text-sm">Schedule</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Today's Collections (UK)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : collections.length > 0 ? (
                <div className="space-y-4">
                  {collections.slice(0, 5).map((item, index) => {
                    // Fix: Safely access metadata properties
                    const metadata = item.metadata || {};
                    const pickupArea = typeof metadata === 'object' && metadata !== null 
                      ? (metadata as Record<string, any>).pickup_area || ''
                      : '';
                    
                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border rounded-md">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 mr-3 flex-shrink-0">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm md:text-base truncate">{item.tracking_number}</h3>
                            <p className="text-xs md:text-sm text-gray-500 truncate">{item.origin}</p>
                            <p className="text-xs text-gray-400 truncate">{pickupArea}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-13 sm:ml-0">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                            {index === 0 ? 'In Progress' : 'Pending'}
                          </Badge>
                          <Button size="sm" variant={index === 0 ? "default" : "outline"} className="text-xs whitespace-nowrap">
                            {index === 0 ? 'Complete' : 'Start'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500 text-sm">No collections assigned for today</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Today's Deliveries (Zimbabwe)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : deliveries.length > 0 ? (
                <div className="space-y-4">
                  {deliveries.slice(0, 5).map((item, index) => {
                    // Fix: Safely access metadata properties
                    const metadata = item.metadata || {};
                    const recipientName = typeof metadata === 'object' && metadata !== null 
                      ? (metadata as Record<string, any>).recipient_name || ''
                      : '';
                    const recipientPhone = typeof metadata === 'object' && metadata !== null 
                      ? (metadata as Record<string, any>).recipient_phone || ''
                      : '';
                    
                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border rounded-md">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 mr-3 flex-shrink-0">
                            <LocateFixed className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm md:text-base truncate">{item.tracking_number}</h3>
                            <p className="text-xs md:text-sm text-gray-500 truncate">{item.destination}</p>
                            {recipientName && (
                              <p className="text-xs text-gray-400 truncate">Recipient: {recipientName}</p>
                            )}
                            {recipientPhone && (
                              <p className="text-xs text-gray-400 truncate">Phone: {recipientPhone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-13 sm:ml-0">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs whitespace-nowrap">
                            {index === 0 ? 'In Progress' : 'Pending'}
                          </Badge>
                          <Button size="sm" variant={index === 0 ? "default" : "outline"} className="text-xs whitespace-nowrap">
                            {index === 0 ? 'Complete' : 'Start'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500 text-sm">No deliveries assigned for today</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.length > 0 ? (
                    schedules.map((schedule) => (
                      <div key={schedule.id} className="flex flex-col sm:flex-row items-start sm:items-center p-3 md:p-4 border rounded-md">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 mr-4 flex-shrink-0">
                            <Calendar className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm md:text-base">{schedule.route}</h3>
                            <p className="text-xs md:text-sm text-gray-500">{schedule.pickup_date}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(schedule.areas || []).slice(0, 3).map((area: string, index: number) => (
                                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                  {area}
                                </Badge>
                              ))}
                              {(schedule.areas || []).length > 3 && (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                                  +{(schedule.areas || []).length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs md:text-sm ml-0 sm:ml-auto mt-2 sm:mt-0">
                          View Details
                        </Button>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center p-3 md:p-4 border rounded-md">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 mr-4 flex-shrink-0">
                            <Calendar className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm md:text-base">Monday</h3>
                            <p className="text-xs md:text-sm text-gray-500">Northampton Area Collections</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs md:text-sm ml-0 sm:ml-auto mt-2 sm:mt-0">
                          View Route
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center p-3 md:p-4 border rounded-md">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100 mr-4 flex-shrink-0">
                            <Calendar className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm md:text-base">Thursday</h3>
                            <p className="text-xs md:text-sm text-gray-500">London Area Collections</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs md:text-sm ml-0 sm:ml-auto mt-2 sm:mt-0">
                          View Route
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center p-3 md:p-4 border rounded-md">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 mr-4 flex-shrink-0">
                            <Calendar className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm md:text-base">Friday</h3>
                            <p className="text-xs md:text-sm text-gray-500">Warehouse Loading/Dispatch</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs md:text-sm ml-0 sm:ml-auto mt-2 sm:mt-0">
                          View Details
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverDashboard;
