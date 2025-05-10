
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isValid, parseISO } from 'date-fns';
import { 
  CalendarIcon, 
  MapPin, 
  RefreshCcw, 
  PlusCircle, 
  Edit, 
  TrashIcon, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CollectionSchedule {
  id: string;
  route: string;
  pickup_date: string;
  areas: string[];
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  date: Date;
  route: string;
  id: string;
  areas: string[];
}

const CollectionScheduleTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<CollectionSchedule[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Form state for editing a schedule
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<CollectionSchedule | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [newPickupDate, setNewPickupDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Today's schedules
  const [todaySchedules, setTodaySchedules] = useState<CollectionSchedule[]>([]);
  
  useEffect(() => {
    fetchCollectionSchedules();
  }, []);
  
  const fetchCollectionSchedules = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });
      
      if (error) throw error;
      
      setRoutes(data || []);
      
      // Transform the data for the calendar
      const calendarEvents: CalendarEvent[] = [];
      data?.forEach(route => {
        try {
          const date = parseISO(route.pickup_date);
          if (isValid(date)) {
            calendarEvents.push({
              date,
              route: route.route,
              id: route.id,
              areas: route.areas
            });
          }
        } catch (err) {
          console.error(`Invalid date format for route ${route.route}: ${route.pickup_date}`);
        }
      });
      
      setEvents(calendarEvents);
      
      // Find schedules for today
      const today = new Date();
      const todaysSchedules = data?.filter(route => {
        try {
          const pickupDate = parseISO(route.pickup_date);
          return (
            pickupDate.getDate() === today.getDate() &&
            pickupDate.getMonth() === today.getMonth() &&
            pickupDate.getFullYear() === today.getFullYear()
          );
        } catch {
          return false;
        }
      }) || [];
      
      setTodaySchedules(todaysSchedules);
      
    } catch (error) {
      console.error('Error fetching collection schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection schedule data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const updateCollectionDate = async () => {
    if (!selectedRoute || !selectedRoute.id || !newPickupDate) {
      toast({
        title: 'Missing information',
        description: 'Please select a route and a new date',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = format(newPickupDate, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('collection_schedules')
        .update({ 
          pickup_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRoute.id);
      
      if (error) throw error;
      
      // Update the local state
      setRoutes(prevRoutes => 
        prevRoutes.map(route => 
          route.id === selectedRoute.id 
            ? { ...route, pickup_date: formattedDate, updated_at: new Date().toISOString() } 
            : route
        )
      );
      
      // Update the calendar events
      setEvents(prevEvents => {
        const updatedEvents = prevEvents.filter(event => event.id !== selectedRoute.id);
        updatedEvents.push({
          date: newPickupDate,
          route: selectedRoute.route,
          id: selectedRoute.id,
          areas: selectedRoute.areas
        });
        return updatedEvents;
      });
      
      // Reset form
      setSelectedRoute(null);
      setNewPickupDate(undefined);
      setIsEditing(false);
      
      // Check if this affects today's schedules
      const today = new Date();
      const isToday = (
        newPickupDate.getDate() === today.getDate() &&
        newPickupDate.getMonth() === today.getMonth() &&
        newPickupDate.getFullYear() === today.getFullYear()
      );
      
      if (isToday) {
        // Refresh today's schedules
        fetchCollectionSchedules();
      }
      
      toast({
        title: 'Schedule Updated',
        description: `Collection date for ${selectedRoute.route} has been updated.`,
      });
      
    } catch (error) {
      console.error('Error updating collection date:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update the collection date.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) throw error;
      
      // Update local state
      setRoutes(prevRoutes => prevRoutes.filter(route => route.id !== scheduleId));
      setEvents(prevEvents => prevEvents.filter(event => event.id !== scheduleId));
      
      // Update today's schedules if needed
      setTodaySchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== scheduleId));
      
      toast({
        title: 'Schedule Deleted',
        description: 'The collection schedule has been deleted.',
      });
      
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the collection schedule.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle route selection for editing
  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    const route = routes.find(r => r.id === routeId);
    if (route) {
      setSelectedRoute(route);
      
      // Parse the date from the route
      try {
        const pickupDate = parseISO(route.pickup_date);
        if (isValid(pickupDate)) {
          setNewPickupDate(pickupDate);
        } else {
          setNewPickupDate(new Date());
        }
      } catch {
        setNewPickupDate(new Date());
      }
    }
  };

  // Function to find events for a particular date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      return (
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear()
      );
    });
  };

  // Define the custom component for calendar days
  const renderCalendarDay = (day: Date) => {
    const dayEvents = getEventsForDate(day);
    
    if (dayEvents.length > 0) {
      return (
        <div className="relative h-full w-full p-2">
          <div className="absolute top-0 right-0">
            <Badge variant="secondary" className="text-xs">
              {dayEvents.length}
            </Badge>
          </div>
          {day.getDate()}
        </div>
      );
    }
    
    return day.getDate();
  };
  
  // Get the selected date's events for display
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Collection Schedule</CardTitle>
            <CardDescription>
              Manage pickup schedules for routes
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCollectionSchedules}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Today's Schedule Card */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Today's Schedule</CardTitle>
                  <CardDescription>
                    Pickups scheduled for today
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {todaySchedules.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg">
                      <CalendarIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">No collections scheduled for today</p>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {todaySchedules.map(schedule => (
                        <li key={schedule.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                              {schedule.route}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setIsEditing(true);
                                handleRouteSelect(schedule.id);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </div>
                          
                          <div className="flex items-start space-x-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <span className="text-gray-600">Areas:</span>{' '}
                              <span>
                                {schedule.areas.join(', ')}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              
              {/* Calendar Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Collection Calendar</CardTitle>
                  <CardDescription>
                    Schedule overview by date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    classNames={{
                      day_today: "bg-muted",
                      day_selected: "bg-primary text-white hover:bg-primary hover:text-primary-foreground"
                    }}
                  />
                  
                  {/* Selected date's schedules */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">
                      {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : "Select a date"}
                    </h3>
                    
                    {selectedDate && selectedDateEvents.length === 0 ? (
                      <div className="text-center py-6 border border-dashed rounded-lg">
                        <p className="text-gray-500">No collections scheduled for selected date</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDateEvents.map(event => (
                          <div key={event.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                {event.route}
                              </Badge>
                              
                              <div className="flex items-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0" 
                                  onClick={() => {
                                    setIsEditing(true);
                                    handleRouteSelect(event.id);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Collection Schedule</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this collection schedule?
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600"
                                        onClick={() => deleteSchedule(event.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-2 text-sm">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div>
                                <span className="text-gray-600">Areas:</span>{' '}
                                <span>
                                  {event.areas.join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Collection Routes List */}
              <Card className="md:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">All Collection Routes</CardTitle>
                    <CardDescription>
                      View and edit scheduled routes
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <a href="#/admin/routes">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Manage Routes
                    </a>
                  </Button>
                </CardHeader>
                <CardContent>
                  {routes.length === 0 ? (
                    <div className="text-center py-10">
                      <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No collection routes have been set up</p>
                      <Button className="mt-4" asChild>
                        <a href="#/admin/routes">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create a Route
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Route Name</TableHead>
                            <TableHead>Areas</TableHead>
                            <TableHead>Collection Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {routes.map(route => (
                            <TableRow key={route.id}>
                              <TableCell className="font-medium">
                                {route.route}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {route.areas.slice(0, 3).map((area, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {area}
                                    </Badge>
                                  ))}
                                  {route.areas.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{route.areas.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  try {
                                    const date = parseISO(route.pickup_date);
                                    return isValid(date) ? format(date, 'MMMM d, yyyy') : 'Invalid date';
                                  } catch {
                                    return 'Invalid date';
                                  }
                                })()}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setIsEditing(true);
                                    handleRouteSelect(route.id);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Date
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Edit Schedule Dialog */}
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Collection Date</DialogTitle>
                <DialogDescription>
                  Update the collection date for this route
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {routes.length > 0 && (
                  <div>
                    <Label htmlFor="route">Route</Label>
                    <Select 
                      value={selectedRouteId} 
                      onValueChange={handleRouteSelect}
                    >
                      <SelectTrigger id="route" className="mt-1">
                        <SelectValue placeholder="Select a route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map(route => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.route}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedRoute && (
                  <>
                    <div>
                      <Label>Areas</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedRoute.areas.map((area, i) => (
                          <Badge key={i} variant="outline">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Current Date</Label>
                      <div className="mt-1">
                        {(() => {
                          try {
                            const date = parseISO(selectedRoute.pickup_date);
                            return isValid(date) ? format(date, 'MMMM d, yyyy') : 'Invalid date';
                          } catch {
                            return 'Invalid date';
                          }
                        })()}
                      </div>
                    </div>
                    
                    <div>
                      <Label>New Collection Date</Label>
                      <Calendar
                        mode="single"
                        selected={newPickupDate}
                        onSelect={setNewPickupDate}
                        className="mt-1 border rounded-md"
                        disabled={(date) => date < new Date()}
                      />
                    </div>
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={updateCollectionDate} 
                  disabled={!selectedRoute || !newPickupDate || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Update Date
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionScheduleTab;
