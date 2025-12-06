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

const CollectionSchedule = () => {
  const [schedules, setSchedules] = useState<CollectionScheduleItem[]>([]);
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
        // Fetch collection schedules directly from database
        // The sync function is only for initializing missing routes, not for regular page loads
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('collection_schedules')
          .select('*')
          .order('route', { ascending: true });
          
        if (schedulesError) throw schedulesError;
        
        if (schedulesData && schedulesData.length > 0) {
          // Filter out any SCOTLAND ROUTE that might still exist
          const filteredData = schedulesData.filter(schedule => schedule.route !== 'SCOTLAND ROUTE');
          setSchedules(filteredData);
          
          // Extract unique routes and areas (excluding SCOTLAND ROUTE)
          const routes = [...new Set(filteredData.map(schedule => schedule.route))];
          setAllRoutes(routes);
          
          const areas = [...new Set(filteredData.flatMap(schedule => schedule.areas))];
          setAllAreas(areas);
          
          console.log('Loaded schedules from database:', filteredData.length);
        } else {
          console.log('No schedules found in database');
          // Show empty state - schedules should be managed in admin dashboard
          setSchedules([]);
          setAllRoutes([]);
          setAllAreas([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load collection schedules",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);

  // Filter schedules based on search term and filters
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = searchTerm === '' || 
      schedule.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.areas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRoute = filterRoute === '' || schedule.route === filterRoute;
    
    const matchesArea = filterArea === '' || 
      schedule.areas.some(area => area === filterArea);
    
    const matchesDate = !filterDate || 
      schedule.pickup_date.toLowerCase().includes(format(filterDate, "do 'of' MMMM").toLowerCase());
    
    return matchesSearch && matchesRoute && matchesArea && matchesDate;
  });

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
                      <SelectItem value="all-routes">All Routes</SelectItem>
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
                      <SelectItem value="all-areas">All Areas</SelectItem>
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
              {filteredSchedules.map((schedule) => (
                <Card key={schedule.id} className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Route Header with Gradient */}
                  <div className="bg-gradient-to-r from-zim-green to-emerald-600 px-4 py-3">
                    <div className="flex items-center gap-2 text-white">
                      <Truck className="h-5 w-5" />
                      <h3 className="font-bold text-lg">{schedule.route}</h3>
                    </div>
                  </div>
                  
                  {/* Collection Date - Prominent Display */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Next Collection Date</p>
                        <p className="font-bold text-lg text-amber-900 dark:text-amber-300">
                          {schedule.pickup_date || 'To be confirmed'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="pt-4">
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-zim-green" />
                        Collection Areas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {schedule.areas.map((area) => (
                          <Badge 
                            key={area} 
                            variant="outline" 
                            className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredSchedules.length === 0 && !loading && (
                <div className="col-span-3 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
                  <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No collection schedules found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
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
