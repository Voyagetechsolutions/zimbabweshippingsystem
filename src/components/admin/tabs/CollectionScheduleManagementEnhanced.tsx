import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isValid, parse } from 'date-fns';
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
  Calendar as CalendarIcon,
  Loader2,
  Save,
  Edit,
  Package,
  Eye,
  Truck,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CollectionSchedule {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  schedule_name: string | null;
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
  collection_schedule_id: string | null;
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

const CollectionScheduleManagementEnhanced = () => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<CollectionSchedule | null>(null);
  const [scheduleShipments, setScheduleShipments] = useState<ShipmentData[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingScheduleName, setEditingScheduleName] = useState<string | null>(null);
  const [newScheduleName, setNewScheduleName] = useState('');

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

  const handleViewScheduleShipments = (schedule: CollectionSchedule) => {
    setSelectedSchedule(schedule);
    const filtered = shipments.filter(s => s.collection_schedule_id === schedule.id);
    setScheduleShipments(filtered);
    setSelectedShipmentIds(new Set());
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
      
      // Update all selected shipments
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

      // Refresh data
      await fetchShipments();
      if (selectedSchedule) {
        const filtered = shipments.filter(s => s.collection_schedule_id === selectedSchedule.id);
        setScheduleShipments(filtered);
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

  const handleUpdateScheduleName = async (scheduleId: string) => {
    if (!newScheduleName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a schedule name',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .update({
          schedule_name: newScheduleName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Schedule Name Updated',
        description: 'Collection schedule name has been updated',
      });

      await fetchSchedules();
      setEditingScheduleName(null);
      setNewScheduleName('');
    } catch (error: any) {
      console.error('Error updating schedule name:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update schedule name',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getShipmentCount = (scheduleId: string) => {
    return shipments.filter(s => s.collection_schedule_id === scheduleId).length;
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

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Collection Schedule Management</h3>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Group shipments by collection schedule for easy bulk status updates. Name your schedules for better organization.
            </p>
          </div>
        </div>
      </div>

      {/* Collection Schedules Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Collection Schedules</CardTitle>
              <CardDescription>
                Manage collection schedules and update shipments in bulk
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => { fetchSchedules(); fetchShipments(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
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
                    <TableHead>Schedule Name</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Areas</TableHead>
                    <TableHead className="text-center">Shipments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No collection schedules found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          {editingScheduleName === schedule.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newScheduleName}
                                onChange={(e) => setNewScheduleName(e.target.value)}
                                placeholder="Enter schedule name"
                                className="h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateScheduleName(schedule.id)}
                                disabled={isUpdating}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingScheduleName(null);
                                  setNewScheduleName('');
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {schedule.schedule_name || 'Unnamed Schedule'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingScheduleName(schedule.id);
                                  setNewScheduleName(schedule.schedule_name || `${schedule.route} - ${schedule.pickup_date}`);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{schedule.route}</TableCell>
                        <TableCell>{schedule.pickup_date}</TableCell>
                        <TableCell>
                          <span className="max-w-xs truncate block text-sm">
                            {schedule.areas.slice(0, 2).join(', ')}
                            {schedule.areas.length > 2 && ` +${schedule.areas.length - 2} more`}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            <Package className="h-3 w-3 mr-1" />
                            {getShipmentCount(schedule.id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewScheduleShipments(schedule)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Shipments
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipments Dialog */}
      <Dialog open={!!selectedSchedule} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              {selectedSchedule?.schedule_name || selectedSchedule?.route}
            </DialogTitle>
            <DialogDescription>
              Manage shipments for this collection schedule. Select multiple shipments to update their status at once.
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
            <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionScheduleManagementEnhanced;
