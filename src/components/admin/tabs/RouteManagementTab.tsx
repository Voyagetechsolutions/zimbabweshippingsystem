
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { 
  Search, 
  Route, 
  RefreshCcw, 
  Plus, 
  MapPin, 
  Calendar as CalendarIcon,
  Mail
} from 'lucide-react';

// Define types
interface RouteData {
  id: string;
  name: string;
  areas: string[];
  pickup_date: string;
  status: string;
  drum_count: number;
}

// Form schema
const routeFormSchema = z.object({
  name: z.string().min(3, { message: "Route name must be at least 3 characters" }),
  areas: z.string().min(3, { message: "Areas must be specified" }),
  pickup_date: z.date(),
});

const RouteManagementTab = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('planner');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Setup form
  const form = useForm<z.infer<typeof routeFormSchema>>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: '',
      areas: '',
      pickup_date: new Date(),
    },
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // In a real implementation, fetch from Supabase
      // For now, using mock data
      const mockRoutes: RouteData[] = [
        {
          id: '1',
          name: 'London North Route',
          areas: ['Harrow', 'Wembley', 'Edgware'],
          pickup_date: '2025-05-15',
          status: 'Scheduled',
          drum_count: 8
        },
        {
          id: '2',
          name: 'London South Route',
          areas: ['Croydon', 'Sutton', 'Merton'],
          pickup_date: '2025-05-16',
          status: 'Scheduled',
          drum_count: 12
        },
        {
          id: '3',
          name: 'Birmingham Route',
          areas: ['Edgbaston', 'Selly Oak', 'Moseley'],
          pickup_date: '2025-05-17',
          status: 'In Progress',
          drum_count: 5
        },
        {
          id: '4',
          name: 'Manchester Route',
          areas: ['Didsbury', 'Chorlton', 'Fallowfield'],
          pickup_date: '2025-05-20',
          status: 'Scheduled',
          drum_count: 15
        }
      ];
      
      setRoutes(mockRoutes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load route data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof routeFormSchema>) => {
    try {
      // Convert areas string to array
      const areasArray = data.areas.split(',').map(area => area.trim());
      
      // Create new route object
      const newRoute: RouteData = {
        id: Math.random().toString(36).substring(7),
        name: data.name,
        areas: areasArray,
        pickup_date: format(data.pickup_date, 'yyyy-MM-dd'),
        status: 'Scheduled',
        drum_count: 0
      };
      
      // In production, save to Supabase
      // const { data: routeData, error } = await supabase
      //   .from('routes')
      //   .insert(newRouteData)
      //   .select()
      //   .single();
      
      // if (error) throw error;
      
      // Update local state
      setRoutes([newRoute, ...routes]);
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Route created successfully',
      });
      
      // Reset form
      form.reset();
    } catch (error) {
      console.error('Error creating route:', error);
      toast({
        title: 'Error',
        description: 'Failed to create route',
        variant: 'destructive'
      });
    }
  };

  const notifyCustomers = (routeId: string) => {
    toast({
      title: 'Notifications sent',
      description: 'Customers have been notified about the collection details',
    });
  };

  const getDrumCountClass = (count: number) => {
    return count >= 10 ? 'text-red-600 font-bold' : '';
  };

  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.areas.some(area => area.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Management & Monitoring</CardTitle>
        <CardDescription>Plan and manage collection routes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Route Planner
            </TabsTrigger>
            <TabsTrigger value="categorization" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Customer Categorization
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="planner">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Route</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Route Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., London North Route" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="areas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pickup Areas</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Harrow, Wembley, Edgware" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="pickup_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Pickup Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className="w-full pl-3 text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date < new Date()
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Route
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <div className="relative flex-grow">
                    <Input
                      placeholder="Search routes..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  <Button 
                    variant="outline"
                    onClick={fetchRoutes}
                    disabled={loading}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : filteredRoutes.length === 0 ? (
                  <div className="text-center p-12">
                    <Route className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No routes found</h3>
                    <p className="text-gray-500">
                      Try adjusting your search or create a new route
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route Name</TableHead>
                          <TableHead>Areas</TableHead>
                          <TableHead>Pickup Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Drums</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoutes.map((route) => (
                          <TableRow key={route.id}>
                            <TableCell className="font-medium">{route.name}</TableCell>
                            <TableCell>{route.areas.join(', ')}</TableCell>
                            <TableCell>{format(new Date(route.pickup_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={route.status === 'In Progress' ? 'default' : 'outline'}>
                                {route.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={getDrumCountClass(route.drum_count)}>
                              {route.drum_count}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => notifyCustomers(route.id)}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Notify
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="categorization">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto-Categorize Customers by Route</CardTitle>
                <CardDescription>
                  This system automatically assigns customers to routes based on their postal code or area.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium mb-4">Current Mappings</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Postal Code/Area</TableHead>
                          <TableHead>Route</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>NW1-NW9</TableCell>
                          <TableCell>London North Route</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>SW1-SW9</TableCell>
                          <TableCell>London South Route</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>B1-B20</TableCell>
                          <TableCell>Birmingham Route</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>M1-M20</TableCell>
                          <TableCell>Manchester Route</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Add New Mapping</h3>
                    <form className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="postalCode">Postal Code/Area</Label>
                          <Input id="postalCode" placeholder="e.g., NW10-NW20 or Harrow" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="route">Route</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a route" />
                            </SelectTrigger>
                            <SelectContent>
                              {routes.map(route => (
                                <SelectItem key={route.id} value={route.id}>
                                  {route.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mapping
                      </Button>
                    </form>
                    
                    <div className="mt-8">
                      <h3 className="text-md font-medium mb-2">Automation Settings</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="auto-assign" />
                          <label
                            htmlFor="auto-assign"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Auto-assign route on shipment creation
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="auto-email" />
                          <label
                            htmlFor="auto-email"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Auto-email collection details
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Missing component declarations for Label and Checkbox
const Label = ({ htmlFor, children }: { htmlFor: string, children: React.ReactNode }) => {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </label>
  );
};

const Checkbox = ({ id }: { id: string }) => {
  return (
    <input
      type="checkbox"
      id={id}
      className="h-4 w-4 rounded border-gray-300 text-zim-green focus:ring-zim-green"
    />
  );
};

export default RouteManagementTab;
