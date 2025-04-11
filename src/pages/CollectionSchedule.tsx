
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Calendar as CalendarIcon, MapPin, Truck, Filter, Search } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CollectionScheduleItem {
  id: string;
  route: string;
  pickup_date: string;
  areas: string[];
}

interface ShipmentData {
  id: string;
  status: string;
  tracking_number: string;
  metadata: {
    pickup_route?: string;
    pickup_area?: string;
    pickup_date?: string;
    shipment_type?: string;
    recipient_name?: string;
  };
}

const CollectionSchedule = () => {
  const [schedules, setSchedules] = useState<CollectionScheduleItem[]>([]);
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [allRoutes, setAllRoutes] = useState<string[]>([]);
  const [allAreas, setAllAreas] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Update the document title when component mounts
    document.title = 'Collection Schedule | Zimbabwe Shipping Services';
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch collection schedules
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('collection_schedules')
          .select('*');
          
        if (schedulesError) throw schedulesError;
        
        if (schedulesData) {
          setSchedules(schedulesData);
          
          // Extract unique routes and areas
          const routes = [...new Set(schedulesData.map(schedule => schedule.route))];
          setAllRoutes(routes);
          
          const areas = [...new Set(schedulesData.flatMap(schedule => schedule.areas))];
          setAllAreas(areas);
        }
        
        // Fetch shipments
        const { data: shipmentsData, error: shipmentsError } = await supabase
          .from('shipments')
          .select('id, tracking_number, status, metadata');
          
        if (shipmentsError) throw shipmentsError;
        
        if (shipmentsData) {
          // Cast the returned data to the expected ShipmentData type
          const typedShipments: ShipmentData[] = shipmentsData.map(shipment => ({
            id: shipment.id,
            tracking_number: shipment.tracking_number,
            status: shipment.status,
            metadata: shipment.metadata as ShipmentData['metadata'] || {}
          }));
          
          setShipments(typedShipments);
          setFilteredShipments(typedShipments);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load collection schedules and shipments.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);

  useEffect(() => {
    // Apply filters whenever filter criteria changes
    let filtered = [...shipments];
    
    if (searchTerm) {
      filtered = filtered.filter(shipment => 
        shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.metadata?.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterRoute) {
      filtered = filtered.filter(shipment => 
        shipment.metadata?.pickup_route === filterRoute
      );
    }
    
    if (filterArea) {
      filtered = filtered.filter(shipment => 
        shipment.metadata?.pickup_area === filterArea
      );
    }
    
    if (filterDate) {
      const dateStr = format(filterDate, 'do of MMMM').toLowerCase();
      filtered = filtered.filter(shipment => 
        shipment.metadata?.pickup_date?.toLowerCase().includes(dateStr)
      );
    }
    
    setFilteredShipments(filtered);
  }, [searchTerm, filterRoute, filterArea, filterDate, shipments]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterRoute('');
    setFilterArea('');
    setFilterDate(undefined);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-8 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Collection Schedule</h1>
            <p className="text-gray-600">
              View our upcoming collection routes and dates
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Find specific collection schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      placeholder="Search by area or route" 
                      className="pl-8"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Select value={filterRoute} onValueChange={setFilterRoute}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Routes</SelectItem>
                      {allRoutes.map(route => (
                        <SelectItem key={route} value={route}>{route}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={filterArea} onValueChange={setFilterArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {allAreas.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterDate}
                        onSelect={setFilterDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="md:col-span-4 flex justify-end">
                  <Button variant="outline" onClick={resetFilters} className="ml-2">
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          )}

          {/* Collection Schedules */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Upcoming Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle>{schedule.route}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {schedule.pickup_date}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Collection Areas:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {schedule.areas.map((area) => (
                          <Badge key={area} variant="outline" className="bg-gray-100">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Shipments for this schedule */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        Shipments:
                      </h4>
                      {filteredShipments.filter(s => 
                        s.metadata?.pickup_route === schedule.route
                      ).length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {filteredShipments
                            .filter(s => s.metadata?.pickup_route === schedule.route)
                            .map(shipment => (
                              <li key={shipment.id} className="p-2 bg-gray-50 rounded-md">
                                <div className="font-medium">{shipment.tracking_number}</div>
                                <div className="text-gray-500">
                                  Area: {shipment.metadata?.pickup_area || 'N/A'}
                                </div>
                                <div className="text-gray-500">
                                  Type: {shipment.metadata?.shipment_type || 'N/A'}
                                </div>
                                <Badge className={
                                  shipment.status === 'Booking Confirmed' ? 'bg-blue-100 text-blue-800' :
                                  shipment.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' :
                                  shipment.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {shipment.status}
                                </Badge>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="text-gray-500 text-sm">No shipments found</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {schedules.length === 0 && !loading && (
                <div className="col-span-3 text-center py-8">
                  <p className="text-gray-500">No collection schedules found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CollectionSchedule;
