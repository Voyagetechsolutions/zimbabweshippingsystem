
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Calendar as CalendarIcon, 
  Loader2, 
  Save, 
  Edit, 
  Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
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
}

const CollectionScheduleTab = () => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  useEffect(() => {
    fetchSchedules();
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
      // Format date as string (YYYY-MM-DD)
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('collection_schedules')
        .update({
          pickup_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // Update local state
      if (data && data.length > 0) {
        setSchedules(prevSchedules => 
          prevSchedules.map(schedule => 
            schedule.id === id ? data[0] : schedule
          )
        );
      }
      
      toast({
        title: 'Date updated',
        description: 'Collection date has been updated successfully',
      });
      
      // Reset editing state
      setEditingScheduleId(null);
      setSelectedDate(new Date());
    } catch (error: any) {
      console.error('Error updating collection date:', error);
      toast({
        title: 'Error',
        description: 'Failed to update collection date',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };
  
  const handleEditClick = (schedule: CollectionSchedule) => {
    setEditingScheduleId(schedule.id);
    setSelectedDate(new Date(schedule.pickup_date));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Collection Schedule</CardTitle>
          <CardDescription>
            View and manage upcoming collection dates for different routes
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
                    <TableHead>Areas</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No collection schedules found</p>
                        <p className="text-sm">Create routes first to add collection schedules</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          {schedule.route}
                        </TableCell>
                        <TableCell>
                          <span className="max-w-xs truncate block">
                            {schedule.areas.join(', ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(schedule.pickup_date), 'MMMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {format(new Date(schedule.updated_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
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
                                    value={format(new Date(schedule.pickup_date), 'MMMM d, yyyy')}
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
    </div>
  );
};

export default CollectionScheduleTab;
