
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Calendar, Clock, Package, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DriverDashboard = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assigned: 0,
    completed: 0,
    pending: 0
  });

  useEffect(() => {
    const fetchDriverTasks = async () => {
      try {
        setLoading(true);
        
        // In a real application, this would fetch from a driver_tasks table
        // For now, we'll pull from shipments and filter for demonstration
        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .in('status', ['Booked', 'Paid', 'In Transit'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          // Filter into collections (UK) and deliveries (Zimbabwe)
          // This is simplified - in a real app, there would be a dedicated table for this
          const collectionsData = data.filter((item, index) => index % 2 === 0);
          const deliveriesData = data.filter((item, index) => index % 2 === 1);
          
          setCollections(collectionsData);
          setDeliveries(deliveriesData);
          
          setStats({
            assigned: data.length,
            completed: Math.floor(data.length * 0.3), // Just for demonstration
            pending: Math.floor(data.length * 0.7) // Just for demonstration
          });
        }
      } catch (error) {
        console.error('Error fetching driver tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverTasks();
  }, []);

  // Map to get a UK postcode area
  const getRandomUKPostcode = () => {
    const areas = ['NN', 'MK', 'LE', 'CV', 'OX', 'B', 'LU'];
    const randomArea = areas[Math.floor(Math.random() * areas.length)];
    return `${randomArea}${Math.floor(Math.random() * 20) + 1} ${Math.floor(Math.random() * 9)}XX`;
  };

  // Map to get a Zimbabwe city
  const getRandomZimCity = () => {
    const cities = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo'];
    return cities[Math.floor(Math.random() * cities.length)];
  };

  // Progress for today's tasks
  const todayProgress = 40; // Example percentage

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <Card>
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

      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections">UK Collections</TabsTrigger>
          <TabsTrigger value="deliveries">Zimbabwe Deliveries</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Collections (UK)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : collections.length > 0 ? (
                <div className="space-y-4">
                  {collections.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 mr-3">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{item.tracking_number}</h3>
                          <p className="text-sm text-gray-500">{getRandomUKPostcode()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {index === 0 ? 'In Progress' : 'Pending'}
                        </Badge>
                        <Button size="sm" variant={index === 0 ? "default" : "outline"}>
                          {index === 0 ? 'Complete' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No collections assigned for today</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Deliveries (Zimbabwe)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : deliveries.length > 0 ? (
                <div className="space-y-4">
                  {deliveries.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 mr-3">
                          <LocateFixed className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{item.tracking_number}</h3>
                          <p className="text-sm text-gray-500">{getRandomZimCity()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {index === 0 ? 'In Progress' : 'Pending'}
                        </Badge>
                        <Button size="sm" variant={index === 0 ? "default" : "outline"}>
                          {index === 0 ? 'Complete' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No deliveries assigned for today</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-4 border rounded-md">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 mr-4">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Monday</h3>
                    <p className="text-sm text-gray-500">Northampton Area Collections</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    View Route
                  </Button>
                </div>

                <div className="flex items-center p-4 border rounded-md">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100 mr-4">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Thursday</h3>
                    <p className="text-sm text-gray-500">London Area Collections</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    View Route
                  </Button>
                </div>

                <div className="flex items-center p-4 border rounded-md">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 mr-4">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Friday</h3>
                    <p className="text-sm text-gray-500">Warehouse Loading/Dispatch</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverDashboard;
