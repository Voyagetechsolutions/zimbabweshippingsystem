
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCountry } from '@/contexts/AdminCountryContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Calendar as CalendarIcon,
  Loader2,
  Save,
  Edit,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Eye,
  Plus,
  User,
  Phone,
  Truck
} from 'lucide-react';
import { format, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parse } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CollectionSchedule {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  created_at: string;
  updated_at: string;
  country?: string;
}

interface ShipmentData {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  metadata: any;
}

const CollectionScheduleTab = () => {
  const { toast } = useToast();
  const { selectedCountry } = useAdminCountry();
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Dialog states
  const [selectedDayDialog, setSelectedDayDialog] = useState<{
    date: Date;
    routes: CollectionSchedule[];
  } | null>(null);
  const [addRouteDialog, setAddRouteDialog] = useState<Date | null>(null);
  const [selectedRouteToAdd, setSelectedRouteToAdd] = useState<string>('');
  const [viewBookingsDialog, setViewBookingsDialog] = useState<{
    route: CollectionSchedule;
    bookings: ShipmentData[];
  } | null>(null);

  useEffect(() => {
    fetchSchedules();
    fetchShipments();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('route', { ascending: true });

      if (error) throw error;

      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching collection schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
    }
  };

  const updateCollectionDate = async (id: string) => {
    if (!selectedDate) {
      toast({
        title: 'Date required',
        description: 'Please select a date for the collection',
        variant: 'destructive',
      });
      return;
    }

    setIsEditing(true);
    try {
      const formattedDate = format(selectedDate, 'MMMM do, yyyy');

      const { error: updateError } = await supabase
        .from('collection_schedules')
        .update({
          pickup_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: 'Date updated successfully',
        description: `Collection date updated to ${formattedDate}`,
      });

      await fetchSchedules();
      setEditingScheduleId(null);
      setSelectedDate(new Date());
    } catch (error: any) {
      console.error('Error updating collection date:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update collection date. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleAddRouteToDate = async () => {
    if (!addRouteDialog || !selectedRouteToAdd) {
      toast({
        title: 'Route required',
        description: 'Please select a route to schedule',
        variant: 'destructive',
      });
      return;
    }

    setIsEditing(true);
    try {
      const formattedDate = format(addRouteDialog, 'MMMM do, yyyy');

      const { error: updateError } = await supabase
        .from('collection_schedules')
        .update({
          pickup_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRouteToAdd);

      if (updateError) throw updateError;

      toast({
        title: 'Route scheduled',
        description: `Route scheduled for ${formattedDate}`,
      });

      await fetchSchedules();
      setAddRouteDialog(null);
      setSelectedRouteToAdd('');
    } catch (error: any) {
      console.error('Error scheduling route:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule route',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleEditClick = (schedule: CollectionSchedule) => {
    setEditingScheduleId(schedule.id);
    try {
      const parsedDate = new Date(schedule.pickup_date);
      setSelectedDate(isValid(parsedDate) ? parsedDate : new Date());
    } catch {
      setSelectedDate(new Date());
    }
  };

  const safeFormatUpdatedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm') : 'Unknown date';
    } catch {
      return 'Unknown date';
    }
  };

  // Helper function to filter schedules by country (handles missing country field)
  const filterByCountry = (schedule: CollectionSchedule) => {
    const scheduleCountry = schedule.country || 'England';
    return (
      (selectedCountry === 'England' && (scheduleCountry === 'England' || scheduleCountry === 'UK' || !schedule.country)) ||
      (selectedCountry === 'Ireland' && scheduleCountry === 'Ireland')
    );
  };

  // Helper function to parse pickup_date in format "March 25th, 2026"
  const parsePickupDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'Not set') return null;

    try {
      // Try parsing "MMMM do, yyyy" format (e.g., "March 25th, 2026")
      // Remove ordinal suffix (st, nd, rd, th) for easier parsing
      const cleanedDate = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
      const parsed = parse(cleanedDate, 'MMMM d, yyyy', new Date());
      if (isValid(parsed)) return parsed;

      // Try standard date parsing as fallback
      const fallback = new Date(dateStr);
      if (isValid(fallback)) return fallback;

      // Try ISO format
      const isoDate = new Date(dateStr);
      if (isValid(isoDate)) return isoDate;

      return null;
    } catch {
      return null;
    }
  };

  // Get scheduled dates for the calendar view
  const getScheduledDates = () => {
    const scheduledDates: { date: Date; routes: CollectionSchedule[] }[] = [];
    const filteredSchedules = schedules.filter(filterByCountry);

    filteredSchedules.forEach(schedule => {
      const date = parsePickupDate(schedule.pickup_date);
      if (date) {
        const existing = scheduledDates.find(d => isSameDay(d.date, date));
        if (existing) {
          existing.routes.push(schedule);
        } else {
          scheduledDates.push({ date, routes: [schedule] });
        }
      }
    });

    return scheduledDates;
  };

  // Generate calendar days for the current month view
  const getCalendarDays = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const startDay = start.getDay();
    const paddedDays: (Date | null)[] = Array(startDay).fill(null).concat(days);
    return paddedDays;
  };

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date | null): CollectionSchedule[] => {
    if (!date) return [];
    const scheduledDates = getScheduledDates();
    const match = scheduledDates.find(d => isSameDay(d.date, date));
    return match ? match.routes : [];
  };

  // Get bookings for a specific route and date
  const getBookingsForRoute = (route: CollectionSchedule): ShipmentData[] => {
    // Match bookings by checking if the shipment's origin matches one of the route's areas
    // or by checking the collection date in metadata
    return shipments.filter(shipment => {
      const metadata = shipment.metadata || {};
      const collectionDate = metadata.collectionDate || metadata.collection_date || metadata.pickupDate;

      // Check if origin matches any route area
      const routeAreas = route.areas.map(a => a.toLowerCase());
      const originMatches = routeAreas.some(area =>
        shipment.origin.toLowerCase().includes(area.split('(')[0].trim()) ||
        area.includes(shipment.origin.toLowerCase())
      );

      // Check if collection date matches the route pickup date
      let dateMatches = false;
      if (collectionDate) {
        try {
          const routeDate = new Date(route.pickup_date);
          const shipmentDate = new Date(collectionDate);
          dateMatches = isSameDay(routeDate, shipmentDate);
        } catch {
          // Ignore date parsing errors
        }
      }

      return originMatches || dateMatches;
    });
  };

  // Get routes without a date set (for adding to calendar)
  const getUnscheduledRoutes = (): CollectionSchedule[] => {
    return schedules.filter(s =>
      filterByCountry(s) &&
      (s.pickup_date === 'Not set' || !s.pickup_date || !isValid(new Date(s.pickup_date)))
    );
  };

  // Handle day click on calendar
  const handleDayClick = (day: Date | null) => {
    if (!day) return;

    const scheduledRoutes = getSchedulesForDate(day);

    if (scheduledRoutes.length > 0) {
      // Day has routes - show them
      setSelectedDayDialog({ date: day, routes: scheduledRoutes });
    } else {
      // Empty day - offer to add a route
      const unscheduledRoutes = getUnscheduledRoutes();
      if (unscheduledRoutes.length > 0) {
        setAddRouteDialog(day);
      } else {
        toast({
          title: 'No routes available',
          description: 'All routes already have dates assigned. Create new routes in the Routes tab.',
        });
      }
    }
  };

  // Helper functions for extracting sender/recipient info
  const getSenderName = (metadata: any): string => {
    if (metadata.sender?.name) return metadata.sender.name;
    if (metadata.sender?.firstName && metadata.sender.lastName) {
      return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
    }
    if (metadata.senderDetails?.firstName && metadata.senderDetails.lastName) {
      return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
    }
    if (metadata.senderDetails?.name) return metadata.senderDetails.name;
    return 'Unknown';
  };

  const getSenderPhone = (metadata: any): string => {
    return metadata.sender?.phone ||
      metadata.senderDetails?.phone ||
      metadata.phone ||
      metadata.sender_phone ||
      'N/A';
  };

  const getRecipientName = (metadata: any): string => {
    return metadata.recipient?.name ||
      metadata.recipientDetails?.name ||
      metadata.recipientName ||
      'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-1">Collection Schedule Management</h3>
            <p className="text-sm text-green-800 dark:text-green-400">
              Click on any day to view or schedule routes. <strong>Empty days</strong> allow you to add routes. <strong>Days with routes</strong> show scheduled pickups and bookings.
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Calendar Overview
              </CardTitle>
              <CardDescription>
                Click on days to manage collection schedules for {selectedCountry}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[160px] text-center">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            {/* Calendar days */}
            {getCalendarDays().map((day, index) => {
              const scheduledRoutes = getSchedulesForDate(day);
              const hasSchedule = scheduledRoutes.length > 0;
              const isToday = day && isSameDay(day, new Date());
              const isPast = day && day < new Date() && !isToday;

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[90px] p-1 border rounded-lg transition-all ${day ? 'cursor-pointer hover:shadow-md hover:border-green-400' : 'bg-gray-50 dark:bg-gray-950'
                    } ${day && !isPast ? 'bg-white dark:bg-gray-900' : ''
                    } ${isPast ? 'bg-gray-50 dark:bg-gray-900/50 opacity-60' : ''
                    } ${isToday ? 'ring-2 ring-green-500' : ''
                    } ${hasSchedule ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-800'
                    }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium flex items-center justify-between ${isToday ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        <span>{format(day, 'd')}</span>
                        {!hasSchedule && !isPast && (
                          <Plus className="h-3 w-3 text-gray-400 hover:text-green-500" />
                        )}
                      </div>
                      {hasSchedule && (
                        <div className="mt-1 space-y-0.5">
                          {scheduledRoutes.slice(0, 2).map((schedule, i) => (
                            <div
                              key={i}
                              className="text-[10px] px-1 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded truncate"
                            >
                              <Truck className="h-2 w-2 inline mr-0.5" />
                              {schedule.route}
                            </div>
                          ))}
                          {scheduledRoutes.length > 2 && (
                            <div className="text-[10px] text-gray-500">
                              +{scheduledRoutes.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              <span>Scheduled pickup</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-green-500"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1">
              <Plus className="h-3 w-3 text-gray-400" />
              <span>Click to schedule</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Schedules Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Collection Schedules</CardTitle>
          <CardDescription>
            Set and update collection dates for each route
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Areas</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.filter(s => filterByCountry(s)).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No collection schedules found</p>
                        <p className="text-sm">
                          No {selectedCountry} routes found. Create routes first in the Routes tab.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules
                      .filter(s => filterByCountry(s))
                      .map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {schedule.route}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${schedule.country === 'Ireland'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                              {schedule.country || 'England'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="max-w-xs truncate block">
                              {schedule.areas.join(', ')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {schedule.pickup_date}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {safeFormatUpdatedDate(schedule.updated_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const bookings = getBookingsForRoute(schedule);
                                  setViewBookingsDialog({ route: schedule, bookings });
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Bookings
                              </Button>
                              <Dialog
                                open={editingScheduleId === schedule.id}
                                onOpenChange={(open) => !open && setEditingScheduleId(null)}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(schedule)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Change Date
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Update Collection Date</DialogTitle>
                                    <DialogDescription>
                                      Set a new collection date for {schedule.route}
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="grid gap-4 py-4">
                                    <div>
                                      <Label htmlFor="route">Route</Label>
                                      <Input
                                        id="route"
                                        value={schedule.route}
                                        disabled
                                        className="mt-1"
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="currentDate">Current Date</Label>
                                      <Input
                                        id="currentDate"
                                        value={schedule.pickup_date}
                                        disabled
                                        className="mt-1"
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="newDate">New Collection Date</Label>
                                      <div className="flex mt-1">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className="w-full justify-start text-left font-normal"
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0">
                                            <CalendarComponent
                                              mode="single"
                                              selected={selectedDate}
                                              onSelect={setSelectedDate}
                                              initialFocus
                                              className="pointer-events-auto"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingScheduleId(null)}>
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => updateCollectionDate(schedule.id)}
                                      disabled={isEditing}
                                    >
                                      {isEditing ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-4 w-4 mr-2" />
                                          Save Date
                                        </>
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={fetchSchedules}>
            Refresh Data
          </Button>
        </CardFooter>
      </Card>

      {/* View Day Routes Dialog */}
      <Dialog open={!!selectedDayDialog} onOpenChange={(open) => !open && setSelectedDayDialog(null)}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              {selectedDayDialog && format(selectedDayDialog.date, 'EEEE, MMMM do, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Scheduled collections for this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedDayDialog?.routes.map((schedule) => {
              const bookings = getBookingsForRoute(schedule);
              return (
                <div key={schedule.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-lg">{schedule.route}</span>
                    </div>
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {bookings.length} bookings
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {schedule.areas.join(', ')}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDayDialog(null);
                        setViewBookingsDialog({ route: schedule, bookings });
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Bookings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDayDialog(null);
                        handleEditClick(schedule);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Change Date
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button onClick={() => setSelectedDayDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Route to Date Dialog */}
      <Dialog open={!!addRouteDialog} onOpenChange={(open) => !open && setAddRouteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Schedule Route
            </DialogTitle>
            <DialogDescription>
              {addRouteDialog && `Schedule a route for ${format(addRouteDialog, 'EEEE, MMMM do, yyyy')}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Select Route</Label>
              <Select value={selectedRouteToAdd} onValueChange={setSelectedRouteToAdd}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a route to schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {getUnscheduledRoutes().map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span>{route.route}</span>
                        <span className="text-muted-foreground text-xs">
                          ({route.areas.slice(0, 2).join(', ')}{route.areas.length > 2 ? '...' : ''})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getUnscheduledRoutes().length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All routes already have dates assigned.</p>
                <p className="text-sm">Create new routes in the Routes tab.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRouteDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRouteToDate}
              disabled={!selectedRouteToAdd || isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Schedule Route
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bookings Dialog */}
      <Dialog open={!!viewBookingsDialog} onOpenChange={(open) => !open && setViewBookingsDialog(null)}>
        <DialogContent className="max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Bookings for {viewBookingsDialog?.route.route}
            </DialogTitle>
            <DialogDescription>
              {viewBookingsDialog?.route.pickup_date} - {viewBookingsDialog?.bookings.length} booking(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {viewBookingsDialog?.bookings.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No bookings found for this route</p>
              </div>
            ) : (
              viewBookingsDialog?.bookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{booking.tracking_number}</span>
                    <Badge variant="outline">{booking.status}</Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Sender</p>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{getSenderName(booking.metadata)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{getSenderPhone(booking.metadata)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Recipient</p>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{getRecipientName(booking.metadata)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-600" />
                      <span>{booking.origin}</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-600" />
                      <span>{booking.destination}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setViewBookingsDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionScheduleTab;
