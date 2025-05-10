
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, RefreshCcw, MapPin, Edit, Trash2 } from 'lucide-react';

interface ScheduleEntry {
  id: string;
  route: string;
  pickup_date: string;
  areas: string[];
  created_at: string;
  updated_at: string;
}

const CollectionScheduleTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);

  // Form state
  const [formRoute, setFormRoute] = useState('');
  const [formDate, setFormDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch collection schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (schedulesError) throw schedulesError;

      setSchedules(schedulesData || []);

      // Extract unique routes for dropdown
      const uniqueRoutes = Array.from(new Set(schedulesData?.map(s => s.route) || []));
      setAvailableRoutes(uniqueRoutes);
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

  const handleAddSchedule = () => {
    setSelectedSchedule(null);
    setFormRoute('');
    setFormDate('');
    setIsDialogOpen(true);
  };

  const handleEditSchedule = (schedule: ScheduleEntry) => {
    setSelectedSchedule(schedule);
    setFormRoute(schedule.route);
    setFormDate(schedule.pickup_date);
    setIsDialogOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Schedule Deleted',
        description: 'Collection schedule has been removed',
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveSchedule = async () => {
    try {
      if (!formRoute || !formDate) {
        toast({
          title: 'Missing Information',
          description: 'Please select both a route and a date',
          variant: 'destructive',
        });
        return;
      }

      if (selectedSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('collection_schedules')
          .update({
            route: formRoute,
            pickup_date: formDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSchedule.id);

        if (error) throw error;

        toast({
          title: 'Schedule Updated',
          description: 'Collection schedule has been updated successfully',
        });
      } else {
        // Get areas for this route from existing schedules
        const existingRoute = schedules.find(s => s.route === formRoute);
        const areas = existingRoute ? existingRoute.areas : [];

        // Create new schedule
        const { error } = await supabase
          .from('collection_schedules')
          .insert({
            route: formRoute,
            pickup_date: formDate,
            areas: areas
          });

        if (error) throw error;

        toast({
          title: 'Schedule Added',
          description: 'New collection schedule has been created',
        });
      }

      // Close dialog and refresh data
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save schedule: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Group schedules by route for display
  const schedulesByRoute = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.route]) {
      acc[schedule.route] = [];
    }
    acc[schedule.route].push(schedule);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Collection Schedule</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchData}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            className="bg-zim-green hover:bg-zim-green/90 flex items-center gap-2"
            onClick={handleAddSchedule}
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Collection Schedules</h3>
            <p className="text-gray-500 mb-6 text-center">
              No collection schedules have been created yet.
              <br />
              Add your first schedule to get started.
            </p>
            <Button 
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={handleAddSchedule}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Schedule Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Collections</CardTitle>
              <CardDescription>Calendar view of upcoming collection schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Areas Covered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.route}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {schedule.pickup_date}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {schedule.areas.slice(0, 3).map((area) => (
                              <Badge key={area} className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {area}
                              </Badge>
                            ))}
                            {schedule.areas.length > 3 && (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                                +{schedule.areas.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSchedule(schedule)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-red-500 flex items-center gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Route Schedule View */}
          {Object.keys(schedulesByRoute).map((route) => (
            <Card key={route} className="mb-6">
              <CardHeader>
                <CardTitle>{route}</CardTitle>
                <CardDescription>
                  Collection schedule for {route} ({schedulesByRoute[route].length} dates)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {schedulesByRoute[route].map((schedule) => (
                    <Card key={schedule.id} className="w-full md:w-[calc(33%-1rem)]">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{schedule.pickup_date}</h4>
                            <p className="text-sm text-gray-500">{schedule.areas.length} areas covered</p>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditSchedule(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Add/Edit Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? 'Edit Collection Schedule' : 'Add Collection Schedule'}
            </DialogTitle>
            <DialogDescription>
              {selectedSchedule 
                ? 'Update the collection date for this route' 
                : 'Schedule a new collection date for pickup'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route</Label>
              {availableRoutes.length > 0 ? (
                <Select value={formRoute} onValueChange={setFormRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoutes.map((route) => (
                      <SelectItem key={route} value={route}>
                        {route}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="route"
                  value={formRoute}
                  onChange={(e) => setFormRoute(e.target.value)}
                  placeholder="Enter route name"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Collection Date</Label>
              <Input
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-zim-green hover:bg-zim-green/90" onClick={handleSaveSchedule}>
              {selectedSchedule ? 'Update Schedule' : 'Add Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionScheduleTab;
