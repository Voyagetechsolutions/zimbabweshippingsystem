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
  Plus,
  MapPin,
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
  
  // Collection Period Management
  const [newPeriodName, setNewPeriodName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<CollectionPeriod | null>(null);
  
  // Calendar Dialog States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddRouteDialog, setShowAddRouteDialog] = useState(false);
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
        description: `Collection period "${newPeriodName}" has been created`,
      });

      await fetchPeriods();
      setNewPeriodName('');
      setSelectedPeriod(data);
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

  const handleAddRoute = async () => {
    if (!selectedDate || !newRouteName.trim() || !newRouteAreas.trim()) {
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
      const pickupDate = format(selectedDate, 'MMMM do, yyyy');

      const { error } = await supabase
        .from('collection_schedules')
        .insert({
          route: newRouteName.trim().toUpperCase(),
          areas: areas,
          pickup_date: pickupDate,
          schedule_name: `${newRouteName.trim().toUpperCase()} - ${pickupDate}`,
          country: selectedCountry,
        });

      if (error) throw error;

      toast({
        title: 'Route Added',
        description: `Route "${newRouteName}" has been added for ${pickupDate}`,
      });

      await fetchSchedules();
      setShowAddRouteDialog(false);
      setNewRouteName('');
      setNewRouteAreas('');
      setSelectedDate(null);
    } catch (error: any) {
      console.error('Error adding route:', error);
      toast({
        title: 'Failed to Add Route',
        description: error.message || 'Failed to add route',
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
    return schedules.filter(s => 
      s.country === selectedCountry && 
      s.pickup_date === dateStr
    );
  };

  const getShipmentCountForSchedule = (scheduleId: string): number => {
    let count = shipments.filter(s => s.collection_schedule_id === scheduleId).length;
    
    // If a period is selected, only count shipments in that period
    if (selectedPeriod) {
      count = shipments.filter(s => 
        s.collection_schedule_id === scheduleId && 
        s.collection_period_id === selectedPeriod.id
      ).length;
    }
    
    return count;
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

            return (
              <div
                key={idx}
                className={`
                  min-h-[100px] border rounded-lg p-2 cursor-pointer transition-all
                  ${isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}
                  ${hasSchedules ? 'border-green-500 hover:border-green-600' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}
                `}
                onClick={() => {
                  setSelectedDate(day);
                  if (hasSchedules) {
                    // Show schedules for this day
                  } else {
                    // Open add route dialog
                    setShowAddRouteDialog(true);
                  }
                }}
              >
                <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </div>
                
                {hasSchedules && (
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
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Collection Period Management */}
      <Card className="shadow-none border border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Collection Period</CardTitle>
          <CardDescription className="text-xs">
            Select or create a collection period to group shipments for bulk updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select
              value={selectedPeriod?.id || ''}
              onValueChange={(value) => {
                const period = periods.find(p => p.id === value);
                setSelectedPeriod(period || null);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a collection period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name} ({period.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="e.g., May 2026"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePeriod();
                }
              }}
            />
            <Button onClick={handleCreatePeriod} disabled={isUpdating}>
              <Plus className="h-4 w-4 mr-1" />
              Create Period
            </Button>
          </div>

          {selectedPeriod && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  Active Period: {selectedPeriod.name}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {shipments.filter(s => s.collection_period_id === selectedPeriod.id).length} shipments
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <DialogTitle>Add Collection Route</DialogTitle>
            <DialogDescription>
              Create a new collection route for {selectedDate && format(selectedDate, 'MMMM do, yyyy')}
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

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  Country: <strong>{selectedCountry}</strong>
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRouteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoute} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Route
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
              {selectedSchedule?.schedule_name || selectedSchedule?.route}
            </DialogTitle>
            <DialogDescription>
              Manage shipments for this collection schedule
              {selectedPeriod && ` in ${selectedPeriod.name}`}
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
