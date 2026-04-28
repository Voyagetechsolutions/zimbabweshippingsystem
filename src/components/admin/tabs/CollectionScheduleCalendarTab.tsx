import React, { useState, useEffect } from 'react';
import TabHeader from '../TabHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  Package,
  Eye,
  Truck,
  CheckSquare,
  Square,
  RefreshCw,
  MapPin,
  Plus,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface CollectionSchedule {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  schedule_name: string | null;
  created_at: string;
  updated_at: string;
  country: string;
  collection_period_id: string | null;
}

interface CollectionPeriod {
  id: string;
  name: string;
  month: string;
  year: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ShipmentData {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  collection_schedule_id: string | null;
  collection_period_id: string | null;
  metadata: any;
}

const STATUS_OPTIONS = [
  'Pending',
  'Booking Confirmed',
  'Ready for Pickup',
  'InTransit to Zimbabwe',
  'Goods Arrived in Zimbabwe',
  'Processing in ZW Warehouse',
  'Delivered',
  'Cancelled',
];

const CollectionScheduleCalendarTab = () => {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<'England' | 'Ireland'>('England');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [periods, setPeriods] = useState<CollectionPeriod[]>([]);
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Collection Period Creation Flow
  const [showCreatePeriodDialog, setShowCreatePeriodDialog] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [creatingPeriod, setCreatingPeriod] = useState<CollectionPeriod | null>(null);
  const [periodSchedules, setPeriodSchedules] = useState<Array<{
    date: Date;
    routeId: string;
    country: string;
  }>>([]);
  
  // Selected Period for Viewing
  const [selectedPeriod, setSelectedPeriod] = useState<CollectionPeriod | null>(null);
  
  // Calendar Dialog States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddRouteDialog, setShowAddRouteDialog] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState<CollectionSchedule[]>([]);
  
  // Create New Route States
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteAreas, setNewRouteAreas] = useState('');
  
  // Shipments Dialog States
  const [showShipmentsDialog, setShowShipmentsDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<CollectionSchedule | null>(null);
  const [scheduleShipments, setScheduleShipments] = useState<ShipmentData[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Get available routes (routes without dates or that can be reused)
    const routes = schedules.filter(s => s.country === selectedCountry);
    setAvailableRoutes(routes);
  }, [schedules, selectedCountry]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSchedules(),
        fetchPeriods(),
        fetchShipments(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching collection schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection schedules',
        variant: 'destructive',
      });
    }
  };

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setPeriods(data || []);
    } catch (error: any) {
      console.error('Error fetching collection periods:', error);
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

  const handleCreatePeriod = async () => {
    if (!newPeriodName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a collection period name',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Parse the period name to extract month and year
      const parts = newPeriodName.trim().split(' ');
      const month = parts[0];
      const year = parseInt(parts[1] || new Date().getFullYear().toString());

      const { data, error } = await supabase
        .from('collection_periods')
        .insert({
          name: newPeriodName.trim(),
          month: month,
          year: year,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Period Created',
        description: `Now add collection dates for ${newPeriodName}`,
      });

      await fetchPeriods();
      setNewPeriodName('');
      setShowCreatePeriodDialog(false);
      
      // Enter period creation mode - show calendar to add dates
      setCreatingPeriod(data);
      setPeriodSchedules([]);
      
    } catch (error: any) {
      console.error('Error creating period:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create collection period',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddDateToPeriod = (date: Date, routeId: string) => {
    // Add this date/route combination to the period being created
    setPeriodSchedules(prev => [...prev, {
      date,
      routeId,
      country: selectedCountry
    }]);
    
    toast({
      title: 'Date Added',
      description: `Collection date added to ${creatingPeriod?.name}`,
    });
  };

  const handleRemoveDateFromPeriod = (index: number) => {
    setPeriodSchedules(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePeriodSchedules = async () => {
    if (periodSchedules.length === 0) {
      toast({
        title: 'No Dates Added',
        description: 'Please add at least one collection date',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Update all routes with their pickup dates and link to period
      for (const schedule of periodSchedules) {
        const pickupDate = format(schedule.date, 'MMMM do, yyyy');
        
        await supabase
          .from('collection_schedules')
          .update({
            pickup_date: pickupDate,
            collection_period_id: creatingPeriod?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.routeId);
      }

      toast({
        title: 'Collection Period Saved',
        description: `${periodSchedules.length} collection dates saved for ${creatingPeriod?.name}`,
      });

      await fetchSchedules();
      setCreatingPeriod(null);
      setPeriodSchedules([]);
      setSelectedPeriod(creatingPeriod);
      
    } catch (error: any) {
      console.error('Error saving period schedules:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save collection schedules',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelPeriodCreation = () => {
    setCreatingPeriod(null);
    setPeriodSchedules([]);
  };

  const handleAddRoute = async () => {
    if (!selectedDate || !selectedRouteId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a route',
        variant: 'destructive',
      });
      return;
    }

    // If we're in period creation mode, add to the list
    if (creatingPeriod) {
      handleAddDateToPeriod(selectedDate, selectedRouteId);
      setShowAddRouteDialog(false);
      setSelectedRouteId('');
      setSelectedDate(null);
      return;
    }

    // Otherwise, update the route directly
    setIsUpdating(true);
    try {
      const pickupDate = format(selectedDate, 'MMMM do, yyyy');

      const { error } = await supabase
        .from('collection_schedules')
        .update({
          pickup_date: pickupDate,
          collection_period_id: selectedPeriod?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRouteId);

      if (error) throw error;

      const selectedRoute = schedules.find(s => s.id === selectedRouteId);

      toast({
        title: 'Route Scheduled',
        description: `Route "${selectedRoute?.route}" has been scheduled for ${pickupDate}`,
      });

      await fetchSchedules();
      setShowAddRouteDialog(false);
      setSelectedRouteId('');
      setSelectedDate(null);
    } catch (error: any) {
      console.error('Error scheduling route:', error);
      toast({
        title: 'Failed to Schedule Route',
        description: error.message || 'Failed to schedule route',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateNewRoute = async () => {
    if (!newRouteName.trim() || !newRouteAreas.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const areas = newRouteAreas.split(',').map(a => a.trim()).filter(a => a);
      const pickupDate = selectedDate ? format(selectedDate, 'MMMM do, yyyy') : '';

      const { error } = await supabase
        .from('collection_schedules')
        .insert({
          route: newRouteName.trim().toUpperCase(),
          areas: areas,
          pickup_date: pickupDate,
          schedule_name: `${newRouteName.trim().toUpperCase()}${pickupDate ? ' - ' + pickupDate : ''}`,
          country: selectedCountry,
        });

      if (error) throw error;

      toast({
        title: 'Route Created',
        description: `Route "${newRouteName}" has been created`,
      });

      await fetchSchedules();
      setShowCreateRouteDialog(false);
      setNewRouteName('');
      setNewRouteAreas('');
    } catch (error: any) {
      console.error('Error creating route:', error);
      toast({
        title: 'Failed to Create Route',
        description: error.message || 'Failed to create route',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewScheduleShipments = (schedule: CollectionSchedule) => {
    setSelectedSchedule(schedule);
    
    // Filter shipments by collection_schedule_id or by matching period
    let filtered = shipments.filter(s => s.collection_schedule_id === schedule.id);
    
    // If a period is selected, also filter by period
    if (selectedPeriod) {
      filtered = filtered.filter(s => s.collection_period_id === selectedPeriod.id);
    }
    
    setScheduleShipments(filtered);
    setSelectedShipmentIds(new Set());
    setShowShipmentsDialog(true);
  };

  const handleToggleShipment = (shipmentId: string) => {
    const newSet = new Set(selectedShipmentIds);
    if (newSet.has(shipmentId)) {
      newSet.delete(shipmentId);
    } else {
      newSet.add(shipmentId);
    }
    setSelectedShipmentIds(newSet);
  };

  const handleToggleAll = () => {
    if (selectedShipmentIds.size === scheduleShipments.length) {
      setSelectedShipmentIds(new Set());
    } else {
      setSelectedShipmentIds(new Set(scheduleShipments.map(s => s.id)));
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedShipmentIds.size === 0 || !bulkStatus) {
      toast({
        title: 'Selection Required',
        description: 'Please select shipments and a status',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const shipmentIds = Array.from(selectedShipmentIds);
      
      const { error } = await supabase
        .from('shipments')
        .update({
          status: bulkStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', shipmentIds);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Updated ${shipmentIds.length} shipment(s) to ${bulkStatus}`,
      });

      await fetchShipments();
      if (selectedSchedule) {
        handleViewScheduleShipments(selectedSchedule);
      }
      setSelectedShipmentIds(new Set());
      setBulkStatus('');
    } catch (error: any) {
      console.error('Error updating shipments:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update shipments',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getSchedulesForDate = (date: Date): CollectionSchedule[] => {
    const dateStr = format(date, 'MMMM do, yyyy');
    
    // If creating a period, show scheduled dates from periodSchedules
    if (creatingPeriod) {
      const scheduledRouteIds = periodSchedules
        .filter(ps => 
          format(ps.date, 'MMMM do, yyyy') === dateStr && 
          ps.country === selectedCountry
        )
        .map(ps => ps.routeId);
      
      return schedules.filter(s => scheduledRouteIds.includes(s.id));
    }
    
    // Otherwise show actual schedules
    return schedules.filter(s => 
      s.country === selectedCountry && 
      s.pickup_date === dateStr &&
      (!selectedPeriod || s.collection_period_id === selectedPeriod.id)
    );
  };

  const getShipmentCountForSchedule = (scheduleId: string): number => {
    return shipments.filter(s => 
      s.collection_schedule_id === scheduleId &&
      (!selectedPeriod || s.collection_period_id === selectedPeriod.id)
    ).length;
  };

  const getPeriodShipmentCount = (periodId: string): number => {
    return shipments.filter(s => s.collection_period_id === periodId).length;
  };

  const handleViewPeriodShipments = (period: CollectionPeriod) => {
    const periodShipments = shipments.filter(s => s.collection_period_id === period.id);
    setScheduleShipments(periodShipments);
    setSelectedShipmentIds(new Set());
    setShowShipmentsDialog(true);
    setSelectedSchedule(null); // Clear schedule, we're viewing by period
  };

  const getSenderName = (metadata: any): string => {
    if (metadata.sender?.name) return metadata.sender.name;
    if (metadata.sender?.firstName && metadata.sender.lastName) {
      return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
    }
    if (metadata.senderDetails?.firstName && metadata.senderDetails.lastName) {
      return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
    }
    return 'Unknown';
  };

  const getRecipientName = (metadata: any): string => {
    return metadata.recipient?.name ||
      metadata.recipientDetails?.name ||
      metadata.recipientName ||
      'Unknown';
  };

  // Calendar rendering
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const schedulesForDay = getSchedulesForDate(day);
            const hasSchedules = schedulesForDay.length > 0;
            
            // Check if this date is in periodSchedules (during creation mode)
            const dateStr = format(day, 'MMMM do, yyyy');
            const periodSchedulesForDay = creatingPeriod 
              ? periodSchedules.filter(ps => 
                  format(ps.date, 'MMMM do, yyyy') === dateStr && 
                  ps.country === selectedCountry
                )
              : [];
            const hasPeriodSchedules = periodSchedulesForDay.length > 0;

            return (
              <div
                key={idx}
                className={`
                  min-h-[100px] border rounded-lg p-2 cursor-pointer transition-all
                  ${isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}
                  ${hasSchedules || hasPeriodSchedules 
                    ? 'border-green-500 hover:border-green-600 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }
                  ${creatingPeriod ? 'hover:bg-green-100 dark:hover:bg-green-900/30' : ''}
                `}
                onClick={() => {
                  setSelectedDate(day);
                  if (creatingPeriod || !hasSchedules) {
                    // Open add route dialog
                    setShowAddRouteDialog(true);
                  }
                }}
              >
                <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </div>
                
                {/* Show period schedules during creation mode */}
                {creatingPeriod && hasPeriodSchedules && (
                  <div className="space-y-1">
                    {periodSchedulesForDay.map((ps, psIdx) => {
                      const route = schedules.find(s => s.id === ps.routeId);
                      return (
                        <div
                          key={psIdx}
                          className="text-xs bg-green-600 text-white rounded px-2 py-1 truncate font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{route?.route}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Show actual schedules when not in creation mode */}
                {!creatingPeriod && hasSchedules && (
                  <div className="space-y-1">
                    {schedulesForDay.map(schedule => (
                      <div
                        key={schedule.id}
                        className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded px-2 py-1 truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewScheduleShipments(schedule);
                        }}
                      >
                        <div className="font-medium">{schedule.route}</div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <Package className="h-2.5 w-2.5" />
                          {getShipmentCountForSchedule(schedule.id)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Show "Add date" hint in creation mode for empty days */}
                {creatingPeriod && !hasPeriodSchedules && isCurrentMonth && (
                  <div className="text-xs text-gray-400 text-center mt-2">
                    Click to add
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <TabHeader
        title="Collection Schedule"
        description="Manage collection schedules by region with calendar view"
        actions={
          <div className="flex gap-2">
            {!creatingPeriod && (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 text-xs bg-green-600 hover:bg-green-700"
                  onClick={() => setShowCreatePeriodDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create Collection Period
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setShowCreateRouteDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create Route
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchData}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Period Creation Mode Banner */}
      {creatingPeriod && (
        <Card className="shadow-none border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Adding Collection Dates for {creatingPeriod.name}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Click on calendar dates to schedule routes. Dates can span multiple months.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-white">
                  {periodSchedules.length} dates added
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelPeriodCreation}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSavePeriodSchedules}
                  disabled={isUpdating || periodSchedules.length === 0}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Period
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Show scheduled dates */}
            {periodSchedules.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                  Scheduled Dates:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {periodSchedules.map((ps, index) => {
                    const route = schedules.find(s => s.id === ps.routeId);
                    return (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-green-200 dark:border-green-800 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{route?.route}</div>
                          <div className="text-xs text-gray-500">{format(ps.date, 'MMM d, yyyy')}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveDateFromPeriod(index)}
                        >
                          ✕
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collection Periods List (when not creating) */}
      {!creatingPeriod && (
        <Card className="shadow-none border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Collection Periods</CardTitle>
            <CardDescription className="text-xs">
              Select a period to view its shipments or create a new period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {periods.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="mb-2">No collection periods yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreatePeriodDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Period
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {periods.map((period) => (
                  <Card
                    key={period.id}
                    className={`cursor-pointer transition-all ${
                      selectedPeriod?.id === period.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{period.name}</h3>
                          <Badge variant="outline" className="mt-1">
                            {period.status}
                          </Badge>
                        </div>
                        {selectedPeriod?.id === period.id && (
                          <div className="h-6 w-6 rounded-full bg-green-600 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>{getPeriodShipmentCount(period.id)} shipments</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPeriodShipments(period);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Region Tabs */}
      <Tabs value={selectedCountry} onValueChange={(v) => setSelectedCountry(v as 'England' | 'Ireland')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="England">England</TabsTrigger>
          <TabsTrigger value="Ireland">Ireland</TabsTrigger>
        </TabsList>

        <TabsContent value="England" className="space-y-4">
          <Card className="shadow-none border border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">England Collection Calendar</CardTitle>
              <CardDescription className="text-xs">
                Click on a date to add a new route or view existing routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                renderCalendar()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Ireland" className="space-y-4">
          <Card className="shadow-none border border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ireland Collection Calendar</CardTitle>
              <CardDescription className="text-xs">
                Click on a date to add a new route or view existing routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                renderCalendar()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Route Dialog */}
      <Dialog open={showAddRouteDialog} onOpenChange={setShowAddRouteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Collection Route</DialogTitle>
            <DialogDescription>
              Select a route to schedule for {selectedDate && format(selectedDate, 'MMMM do, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Route</Label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a route" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoutes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{route.route}</span>
                        <span className="text-xs text-gray-500">
                          {route.areas.slice(0, 3).join(', ')}
                          {route.areas.length > 3 && ` +${route.areas.length - 3} more`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Select from existing routes in the system
              </p>
            </div>

            {selectedRouteId && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Country: <strong>{selectedCountry}</strong>
                  </span>
                </div>
                {(() => {
                  const route = availableRoutes.find(r => r.id === selectedRouteId);
                  return route ? (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Areas covered:</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {route.areas.join(', ')}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRouteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoute} disabled={isUpdating || !selectedRouteId}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Route
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Period Dialog */}
      <Dialog open={showCreatePeriodDialog} onOpenChange={setShowCreatePeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection Period</DialogTitle>
            <DialogDescription>
              Create a new collection period and then add collection dates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Period Name</Label>
              <Input
                placeholder="e.g., May 2026"
                value={newPeriodName}
                onChange={(e) => setNewPeriodName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPeriodName.trim()) {
                    handleCreatePeriod();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Format: Month Year (e.g., "May 2026", "June 2026")
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                After creating the period, you'll be able to add collection dates using the calendar. 
                Dates can span multiple months as long as they belong to this collection period.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePeriodDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod} disabled={isUpdating || !newPeriodName.trim()}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create & Add Dates
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Route Dialog */}
      <Dialog open={showCreateRouteDialog} onOpenChange={setShowCreateRouteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Route</DialogTitle>
            <DialogDescription>
              Add a new collection route to the system for {selectedCountry}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Route Name</Label>
              <Input
                placeholder="e.g., LONDON ROUTE"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
              />
            </div>

            <div>
              <Label>Areas (comma-separated)</Label>
              <Textarea
                placeholder="e.g., Central London, Heathrow, East London"
                value={newRouteAreas}
                onChange={(e) => setNewRouteAreas(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 dark:text-blue-200">
                  This route will be created for <strong>{selectedCountry}</strong>
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                After creating, you can schedule it on the calendar
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRouteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewRoute} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Route
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipments Dialog */}
      <Dialog open={showShipmentsDialog} onOpenChange={setShowShipmentsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              {selectedSchedule 
                ? (selectedSchedule.schedule_name || selectedSchedule.route)
                : selectedPeriod
                ? `All Shipments - ${selectedPeriod.name}`
                : 'Shipments'
              }
            </DialogTitle>
            <DialogDescription>
              {selectedSchedule 
                ? `Manage shipments for this collection schedule`
                : `Viewing all shipments for this collection period`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Bulk Actions */}
          {scheduleShipments.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAll}
                  >
                    {selectedShipmentIds.size === scheduleShipments.length ? (
                      <><CheckSquare className="h-4 w-4 mr-2" /> Deselect All</>
                    ) : (
                      <><Square className="h-4 w-4 mr-2" /> Select All</>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedShipmentIds.size} of {scheduleShipments.length} selected
                  </span>
                </div>
              </div>

              {selectedShipmentIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium">Bulk Update Status:</Label>
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkStatusUpdate}
                    disabled={!bulkStatus || isUpdating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>Update {selectedShipmentIds.size} Shipment(s)</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Shipments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedShipmentIds.size === scheduleShipments.length && scheduleShipments.length > 0}
                      onCheckedChange={handleToggleAll}
                    />
                  </TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No shipments found for this schedule</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  scheduleShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedShipmentIds.has(shipment.id)}
                          onCheckedChange={() => handleToggleShipment(shipment.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                      <TableCell>{getSenderName(shipment.metadata)}</TableCell>
                      <TableCell>{getRecipientName(shipment.metadata)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{shipment.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShipmentsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionScheduleCalendarTab;
