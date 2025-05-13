
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  CalendarIcon, 
  PlusCircle, 
  MapPin, 
  Truck, 
  Edit, 
  Trash2, 
  Mail,
  Send,
  Calendar as CalendarIcon2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<string[]>([]);
  const [areas, setAreas] = useState<{ [key: string]: string[] }>({});
  const [schedules, setSchedules] = useState<any[]>([]);
  const [newRoute, setNewRoute] = useState<string>('');
  const [newArea, setNewArea] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showAddRouteDialog, setShowAddRouteDialog] = useState<boolean>(false);
  const [showAddAreaDialog, setShowAddAreaDialog] = useState<boolean>(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState<boolean>(false);
  const [shipmentsByRoute, setShipmentsByRoute] = useState<{ [key: string]: any[] }>({});
  const [showEmailDialog, setShowEmailDialog] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailContent, setEmailContent] = useState<string>('');
  
  useEffect(() => {
    fetchSchedules();
    fetchShipments();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('collection_schedules').select('*');
      
      if (error) throw error;
      
      // Process the data to extract routes and areas
      const routesSet = new Set<string>();
      const areasMap: { [key: string]: string[] } = {};
      
      data?.forEach(schedule => {
        routesSet.add(schedule.route);
        if (!areasMap[schedule.route]) {
          areasMap[schedule.route] = [];
        }
        schedule.areas.forEach((area: string) => {
          if (!areasMap[schedule.route].includes(area)) {
            areasMap[schedule.route].push(area);
          }
        });
      });
      
      setRoutes(Array.from(routesSet).sort());
      setAreas(areasMap);
      setSchedules(data || []);
      
      // Set the first route as selected if none is selected
      if (!selectedRoute && Array.from(routesSet).length > 0) {
        setSelectedRoute(Array.from(routesSet)[0]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pickup zones data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase.from('shipments').select('*');
      
      if (error) throw error;
      
      // Group shipments by route
      const groupedShipments: { [key: string]: any[] } = {};
      
      data?.forEach(shipment => {
        // Fix: Properly type and access metadata.collection_info
        const metadata = shipment.metadata as Record<string, any>;
        const route = metadata?.collection_info?.route || 'Unassigned';
        
        if (!groupedShipments[route]) {
          groupedShipments[route] = [];
        }
        
        groupedShipments[route].push(shipment);
      });
      
      setShipmentsByRoute(groupedShipments);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    }
  };

  const handleAddRoute = async () => {
    if (!newRoute.trim()) {
      toast({
        title: 'Error',
        description: 'Route name cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Check if route already exists
      if (routes.includes(newRoute)) {
        toast({
          title: 'Error',
          description: 'This route already exists',
          variant: 'destructive',
        });
        return;
      }
      
      // Create a new schedule with this route but no areas yet
      const { error } = await supabase.from('collection_schedules').insert({
        route: newRoute,
        areas: [], // Initialize with no areas
        pickup_date: null // No date scheduled yet
      });
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Route "${newRoute}" has been added`,
      });
      
      // Refresh the data
      await fetchSchedules();
      setSelectedRoute(newRoute);
      setNewRoute('');
      setShowAddRouteDialog(false);
    } catch (error) {
      console.error('Error adding route:', error);
      toast({
        title: 'Error',
        description: 'Failed to add new route',
        variant: 'destructive',
      });
    }
  };

  const handleAddArea = async () => {
    if (!selectedRoute) {
      toast({
        title: 'Error',
        description: 'Please select a route first',
        variant: 'destructive',
      });
      return;
    }
    
    if (!newArea.trim()) {
      toast({
        title: 'Error',
        description: 'Area name cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Check if area already exists in this route
      if (areas[selectedRoute]?.includes(newArea)) {
        toast({
          title: 'Error',
          description: 'This area already exists in the selected route',
          variant: 'destructive',
        });
        return;
      }
      
      // Find the schedule for this route
      const schedule = schedules.find(s => s.route === selectedRoute);
      
      if (!schedule) {
        toast({
          title: 'Error',
          description: 'Schedule not found for this route',
          variant: 'destructive',
        });
        return;
      }
      
      // Add the new area to the existing areas
      const updatedAreas = [...(schedule.areas || []), newArea];
      
      // Update the schedule
      const { error } = await supabase
        .from('collection_schedules')
        .update({ areas: updatedAreas })
        .eq('id', schedule.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Area "${newArea}" has been added to route "${selectedRoute}"`,
      });
      
      // Refresh the data
      await fetchSchedules();
      setNewArea('');
      setShowAddAreaDialog(false);
    } catch (error) {
      console.error('Error adding area:', error);
      toast({
        title: 'Error',
        description: 'Failed to add new area',
        variant: 'destructive',
      });
    }
  };

  const handleSchedulePickup = async () => {
    if (!selectedRoute) {
      toast({
        title: 'Error',
        description: 'Please select a route first',
        variant: 'destructive',
      });
      return;
    }
    
    if (!date) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Find the schedule for this route
      const schedule = schedules.find(s => s.route === selectedRoute);
      
      if (!schedule) {
        toast({
          title: 'Error',
          description: 'Schedule not found for this route',
          variant: 'destructive',
        });
        return;
      }
      
      // Format the date as YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Update the schedule
      const { error } = await supabase
        .from('collection_schedules')
        .update({ pickup_date: formattedDate })
        .eq('id', schedule.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Pickup scheduled for ${formattedDate} on route "${selectedRoute}"`,
      });
      
      // Refresh the data
      await fetchSchedules();
      setDate(undefined);
      setShowScheduleDialog(false);
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule pickup',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRoute = async (route: string) => {
    if (!route) return;
    
    if (window.confirm(`Are you sure you want to delete the route "${route}" and all its areas?`)) {
      try {
        // Find all schedules for this route
        const routeSchedules = schedules.filter(s => s.route === route);
        
        // Delete each schedule
        for (const schedule of routeSchedules) {
          const { error } = await supabase
            .from('collection_schedules')
            .delete()
            .eq('id', schedule.id);
          
          if (error) throw error;
        }
        
        toast({
          title: 'Success',
          description: `Route "${route}" and all its areas have been deleted`,
        });
        
        // Refresh the data
        await fetchSchedules();
        
        // Reset selected route if it was the deleted one
        if (selectedRoute === route) {
          setSelectedRoute('');
        }
      } catch (error) {
        console.error('Error deleting route:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete route',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteArea = async (route: string, area: string) => {
    if (!route || !area) return;
    
    if (window.confirm(`Are you sure you want to delete the area "${area}" from route "${route}"?`)) {
      try {
        // Find the schedule for this route
        const schedule = schedules.find(s => s.route === route);
        
        if (!schedule) {
          toast({
            title: 'Error',
            description: 'Schedule not found for this route',
            variant: 'destructive',
          });
          return;
        }
        
        // Remove the area from the existing areas
        const updatedAreas = (schedule.areas || []).filter((a: string) => a !== area);
        
        // Update the schedule
        const { error } = await supabase
          .from('collection_schedules')
          .update({ areas: updatedAreas })
          .eq('id', schedule.id);
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: `Area "${area}" has been removed from route "${route}"`,
        });
        
        // Refresh the data
        await fetchSchedules();
      } catch (error) {
        console.error('Error deleting area:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete area',
          variant: 'destructive',
        });
      }
    }
  };

  const getPickupDate = (route: string) => {
    const schedule = schedules.find(s => s.route === route);
    return schedule?.pickup_date || null;
  };

  const formatPickupDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    
    try {
      const date = parse(dateString, 'yyyy-MM-dd', new Date());
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error parsing date:', error);
      return dateString;
    }
  };

  const getShipmentCount = (route: string) => {
    return shipmentsByRoute[route]?.length || 0;
  };

  const notifyCustomers = async () => {
    if (!selectedRoute) {
      toast({
        title: 'No Route Selected',
        description: 'Please select a route first.',
        variant: 'default',
      });
      return;
    }
    
    const shipments = shipmentsByRoute[selectedRoute] || [];
    
    if (shipments.length === 0) {
      toast({
        title: 'No Customers',
        description: 'There are no customers to notify for this route.',
        variant: 'default',
      });
      return;
    }
    
    const pickupDate = getPickupDate(selectedRoute);
    
    if (!pickupDate) {
      toast({
        title: 'No Pickup Date',
        description: 'Please schedule a pickup date for this route first.',
        variant: 'default',
      });
      return;
    }
    
    // Get unique customer emails
    const customerEmails = new Set<string>();
    
    shipments.forEach(shipment => {
      const metadata = shipment.metadata as Record<string, any>;
      const email = metadata?.sender_details?.email;
      if (email) {
        customerEmails.add(email);
      }
    });
    
    if (customerEmails.size === 0) {
      toast({
        title: 'No Emails Found',
        description: 'No valid email addresses found for customers in this route.',
        variant: 'default',
      });
      return;
    }
    
    // Prepare default email content
    const formattedDate = formatPickupDate(pickupDate);
    setEmailSubject(`Upcoming collection on ${formattedDate} - ${selectedRoute} route`);
    setEmailContent(`Dear Customer,

We're writing to inform you that we have scheduled a collection in your area (${selectedRoute}) on ${formattedDate}.

Please ensure your packages are ready for collection on this date. If you have any questions or need to make special arrangements, please contact us as soon as possible.

Thank you for choosing our services.

Best regards,
UK to Zimbabwe Shipping Team`);
    
    setShowEmailDialog(true);
  };

  const sendEmails = async () => {
    try {
      // Get shipments for the selected route
      const shipments = shipmentsByRoute[selectedRoute] || [];
      
      // Get unique customer emails with names
      const customers: Array<{ email: string, name: string }> = [];
      
      shipments.forEach(shipment => {
        const metadata = shipment.metadata as Record<string, any>;
        const email = metadata?.sender_details?.email;
        const name = metadata?.sender_details?.name || 'Customer';
        
        if (email && !customers.some(c => c.email === email)) {
          customers.push({ email, name });
        }
      });
      
      // Use the edge function to send emails
      await Promise.all(customers.map(async (customer) => {
        try {
          await supabase.functions.invoke('send-brevo-email', {
            body: {
              to: customer.email,
              name: customer.name,
              subject: emailSubject,
              content: emailContent,
              templateId: 1 // Use a default template ID
            }
          });
        } catch (err) {
          console.error(`Failed to send email to ${customer.email}:`, err);
        }
      }));
      
      toast({
        title: 'Emails Sent',
        description: `Notifications sent to ${customers.length} customers in the ${selectedRoute} route.`,
      });
      
      setShowEmailDialog(false);
    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email notifications.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Pickup Zones Management</h2>
          <p className="text-muted-foreground">
            Manage collection routes, areas, and schedules
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          <Button onClick={() => setShowAddRouteDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Route
          </Button>
        </div>
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Routes & Areas</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Collection Schedules</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Routes List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle>Collection Routes</CardTitle>
                <CardDescription>
                  Select a route to manage its areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
                  </div>
                ) : routes.length > 0 ? (
                  <div className="space-y-2">
                    {routes.map((route) => (
                      <div 
                        key={route}
                        className={cn(
                          "flex justify-between items-center p-3 rounded-md cursor-pointer",
                          selectedRoute === route 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => setSelectedRoute(route)}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{route}</span>
                        </div>
                        <Badge>{getShipmentCount(route)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No routes defined yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Areas for Selected Route */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {selectedRoute ? `Areas in ${selectedRoute}` : 'Select a Route'}
                    </CardTitle>
                    <CardDescription>
                      {selectedRoute 
                        ? `${areas[selectedRoute]?.length || 0} areas defined in this route` 
                        : 'Choose a route from the list to manage its areas'
                      }
                    </CardDescription>
                  </div>
                  {selectedRoute && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAddAreaDialog(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Add Area
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteRoute(selectedRoute)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Route
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
                  </div>
                ) : selectedRoute ? (
                  areas[selectedRoute]?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {areas[selectedRoute]?.map((area) => (
                        <div 
                          key={area}
                          className="flex justify-between items-center p-3 bg-accent rounded-md"
                        >
                          <span>{area}</span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteArea(selectedRoute, area)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No areas defined for this route yet
                      <div className="mt-4">
                        <Button onClick={() => setShowAddAreaDialog(true)}>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add First Area
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a route to manage its areas
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Collection Schedules</CardTitle>
                  <CardDescription>
                    Manage pickup dates for each route
                  </CardDescription>
                </div>
                {selectedRoute && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowScheduleDialog(true)}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Schedule Pickup
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={notifyCustomers}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Notify Customers
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : routes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Areas</TableHead>
                      <TableHead>Customers</TableHead>
                      <TableHead>Next Pickup</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route}>
                        <TableCell className="font-medium">{route}</TableCell>
                        <TableCell>{areas[route]?.length || 0} areas</TableCell>
                        <TableCell>{getShipmentCount(route)}</TableCell>
                        <TableCell>
                          {formatPickupDate(getPickupDate(route))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedRoute(route);
                                setShowScheduleDialog(true);
                              }}
                            >
                              <CalendarIcon2 className="h-4 w-4 mr-1" />
                              Schedule
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRoute(route);
                                notifyCustomers();
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Notify
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No routes defined yet. Add routes to manage collection schedules.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Route Dialog */}
      <Dialog open={showAddRouteDialog} onOpenChange={setShowAddRouteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Route</DialogTitle>
            <DialogDescription>
              Create a new collection route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route-name">Route Name</Label>
              <Input
                id="route-name"
                placeholder="e.g., Northampton, Birmingham, etc."
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRouteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoute}>Add Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Area Dialog */}
      <Dialog open={showAddAreaDialog} onOpenChange={setShowAddAreaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Area</DialogTitle>
            <DialogDescription>
              Add an area to the {selectedRoute} route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-name">Area Name</Label>
              <Input
                id="area-name"
                placeholder="e.g., NN1, B1, etc."
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAreaDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddArea}>Add Area</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Pickup Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Pickup</DialogTitle>
            <DialogDescription>
              Set a collection date for the {selectedRoute} route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select a Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedulePickup}>Schedule Pickup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Notification Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Notify Customers</DialogTitle>
            <DialogDescription>
              Send email notification to customers in the {selectedRoute} route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Email Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-content">Email Content</Label>
              <textarea
                id="email-content"
                className="w-full min-h-[200px] p-2 border rounded-md"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmails}>
              <Send className="h-4 w-4 mr-2" />
              Send Notifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PickupZonesManagementTab;
