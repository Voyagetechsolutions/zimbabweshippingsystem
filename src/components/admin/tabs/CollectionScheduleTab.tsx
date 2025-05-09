
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { 
  CalendarIcon, 
  Calendar as CalendarDays, 
  Download, 
  PlusCircle, 
  Trash2, 
  Edit, 
  Mail,
  MailCheck
} from 'lucide-react';

// Define types for collection schedule data
interface CollectionSchedule {
  id: string;
  route: string;
  pickup_date: string;
  areas: string[];
  created_at: string;
  updated_at: string;
}

interface Shipment {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_email: string;
  pickup_address: string;
  items: string;
  assigned_route?: string;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CollectionScheduleTab = () => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<CollectionSchedule | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
  
  // New schedule form state
  const [newRoute, setNewRoute] = useState('');
  const [newPickupDate, setNewPickupDate] = useState<Date | undefined>(new Date());
  const [newAreas, setNewAreas] = useState<string[]>([]);

  // Edit schedule dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Simulated data - in a real app, this would come from the database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch this data from your database
        // For demo purposes, we'll use mock data
        const mockSchedules: CollectionSchedule[] = [
          {
            id: 'cs1',
            route: 'London North',
            pickup_date: '2025-05-12',
            areas: ['Camden', 'Islington', 'Haringey'],
            created_at: '2025-05-01T10:30:00',
            updated_at: '2025-05-05T14:15:00'
          },
          {
            id: 'cs2',
            route: 'London South',
            pickup_date: '2025-05-14',
            areas: ['Croydon', 'Bromley', 'Greenwich'],
            created_at: '2025-05-01T11:00:00',
            updated_at: '2025-05-01T11:00:00'
          },
          {
            id: 'cs3',
            route: 'Manchester',
            pickup_date: '2025-05-16',
            areas: ['Trafford', 'Salford', 'Stockport'],
            created_at: '2025-05-02T09:45:00',
            updated_at: '2025-05-03T16:20:00'
          }
        ];
        
        const mockShipments: Shipment[] = [
          {
            id: 's1',
            tracking_number: 'ZIMSHIP-12345',
            customer_name: 'Alice Moyo',
            customer_email: 'alice@example.com',
            pickup_address: '123 Camden High St, London',
            items: '2 Drums',
            assigned_route: 'London North'
          },
          {
            id: 's2',
            tracking_number: 'ZIMSHIP-23456',
            customer_name: 'Thomas Ncube',
            customer_email: 'thomas@example.com',
            pickup_address: '45 Islington Park St, London',
            items: '1 Drum, 2 Boxes',
            assigned_route: 'London North'
          },
          {
            id: 's3',
            tracking_number: 'ZIMSHIP-34567',
            customer_name: 'Grace Mutasa',
            customer_email: 'grace@example.com',
            pickup_address: '78 Croydon Road, London',
            items: '3 Boxes',
            assigned_route: 'London South'
          }
        ];

        // In production, you'd fetch from Supabase here
        // const { data, error } = await supabase
        //   .from('collection_schedules')
        //   .select('*')
        //   .order('pickup_date', { ascending: true });
        
        // if (error) throw error;
        
        setSchedules(mockSchedules);
        setShipments(mockShipments);
      } catch (error) {
        console.error('Error fetching collection schedules:', error);
        toast({
          title: 'Error',
          description: 'Failed to load collection schedules',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleAddSchedule = async () => {
    if (!newRoute || !newPickupDate || newAreas.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newSchedule: Partial<CollectionSchedule> = {
        route: newRoute,
        pickup_date: newPickupDate.toISOString().split('T')[0],
        areas: newAreas
      };

      // In production, you'd insert into Supabase here
      // const { data, error } = await supabase
      //   .from('collection_schedules')
      //   .insert(newSchedule)
      //   .select()
      //   .single();
      
      // if (error) throw error;

      // For demo purposes, we'll just add it to our local state
      const mockId = `cs${schedules.length + 1}`;
      const now = new Date().toISOString();
      
      const fullNewSchedule: CollectionSchedule = {
        ...newSchedule as CollectionSchedule,
        id: mockId,
        created_at: now,
        updated_at: now
      };
      
      setSchedules([...schedules, fullNewSchedule]);
      
      toast({
        title: 'Schedule Created',
        description: 'The collection schedule has been created successfully',
      });
      
      // Reset form and close dialog
      setNewRoute('');
      setNewPickupDate(new Date());
      setNewAreas([]);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating collection schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create collection schedule',
        variant: 'destructive'
      });
    }
  };

  const handleEditSchedule = async () => {
    if (!selectedSchedule || !newRoute || !newPickupDate || newAreas.length === 0) {
      return;
    }

    try {
      const updatedSchedule: Partial<CollectionSchedule> = {
        route: newRoute,
        pickup_date: newPickupDate.toISOString().split('T')[0],
        areas: newAreas
      };

      // In production, you'd update in Supabase here
      // const { data, error } = await supabase
      //   .from('collection_schedules')
      //   .update(updatedSchedule)
      //   .eq('id', selectedSchedule.id)
      //   .select()
      //   .single();
      
      // if (error) throw error;

      // For demo purposes, we'll just update our local state
      setSchedules(schedules.map(schedule => 
        schedule.id === selectedSchedule.id 
          ? { 
              ...schedule, 
              ...updatedSchedule, 
              updated_at: new Date().toISOString()
            } 
          : schedule
      ));
      
      toast({
        title: 'Schedule Updated',
        description: 'The collection schedule has been updated successfully',
      });
      
      // Reset form and close dialog
      setSelectedSchedule(null);
      setNewRoute('');
      setNewPickupDate(new Date());
      setNewAreas([]);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating collection schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update collection schedule',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      // In production, you'd delete from Supabase here
      // const { error } = await supabase
      //   .from('collection_schedules')
      //   .delete()
      //   .eq('id', scheduleId);
      
      // if (error) throw error;

      // For demo purposes, we'll just update our local state
      setSchedules(schedules.filter(schedule => schedule.id !== scheduleId));
      
      toast({
        title: 'Schedule Deleted',
        description: 'The collection schedule has been deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting collection schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete collection schedule',
        variant: 'destructive'
      });
    }
  };

  const handleOpenEditDialog = (schedule: CollectionSchedule) => {
    setSelectedSchedule(schedule);
    setNewRoute(schedule.route);
    setNewPickupDate(new Date(schedule.pickup_date));
    setNewAreas(schedule.areas);
    setIsEditDialogOpen(true);
  };

  const notifyDrivers = () => {
    toast({
      title: 'Drivers Notified',
      description: 'Collection schedule information has been sent to drivers',
    });
  };

  const notifyCustomers = () => {
    toast({
      title: 'Customers Notified',
      description: 'Collection schedule information has been sent to customers',
    });
  };

  const exportToCalendar = () => {
    toast({
      title: 'Calendar Exported',
      description: 'The collection schedule has been exported to calendar format',
    });
  };

  // Get shipments for a specific route
  const getShipmentsForRoute = (route: string) => {
    return shipments.filter(shipment => shipment.assigned_route === route);
  };
  
  // Filter schedules for the selected date
  const getSchedulesForDate = () => {
    if (!selectedDate) return [];
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    return schedules.filter(schedule => schedule.pickup_date === dateStr);
  };

  const schedulesForSelectedDate = getSchedulesForDate();

  const toggleSelectShipment = (id: string) => {
    setSelectedShipments(prevSelected => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter(shipmentId => shipmentId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Collection Schedule</CardTitle>
              <CardDescription>Manage your UK collection schedule and routes</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Calendar View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="pointer-events-auto"
                  />
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full" onClick={exportToCalendar}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {selectedDate && (
                      <span>Collections for {format(selectedDate, 'EEEE, MMM d, yyyy')}</span>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : schedulesForSelectedDate.length === 0 ? (
                  <div className="text-center p-12">
                    <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No collections scheduled</h3>
                    <p className="text-gray-500 mb-4">
                      There are no collection routes scheduled for this date
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Schedule Collection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {schedulesForSelectedDate.map((schedule) => (
                      <div key={schedule.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-medium">{schedule.route}</h3>
                            <p className="text-sm text-gray-500">
                              {format(new Date(schedule.pickup_date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {schedule.areas.map((area) => (
                                <Badge key={area}>{area}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenEditDialog(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Shipments ({getShipmentsForRoute(schedule.route).length})</h4>
                          {getShipmentsForRoute(schedule.route).length > 0 ? (
                            <div className="space-y-2">
                              {getShipmentsForRoute(schedule.route).map((shipment) => (
                                <div 
                                  key={shipment.id} 
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedShipments.includes(shipment.id)}
                                      onChange={() => toggleSelectShipment(shipment.id)}
                                      className="h-4 w-4"
                                    />
                                    <div>
                                      <div className="font-medium">{shipment.tracking_number}</div>
                                      <div className="text-sm">{shipment.customer_name}</div>
                                      <div className="text-xs text-gray-500">{shipment.pickup_address}</div>
                                    </div>
                                  </div>
                                  <div>{shipment.items}</div>
                                </div>
                              ))}
                              
                              <div className="flex space-x-2 mt-4">
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={notifyDrivers}
                                  className="flex-1"
                                >
                                  <MailCheck className="h-4 w-4 mr-2" />
                                  Notify Drivers
                                </Button>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={notifyCustomers}
                                  className="flex-1"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Notify Customers
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No shipments assigned to this route</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Collection Schedule</DialogTitle>
            <DialogDescription>
              Create a new collection schedule and route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route Name</Label>
              <Input 
                id="route" 
                placeholder="e.g., London North" 
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pickup Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newPickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newPickupDate ? format(newPickupDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newPickupDate}
                    onSelect={setNewPickupDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Areas Covered</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Camden', 'Islington', 'Haringey', 'Hackney', 'Westminster', 'Croydon', 'Bromley', 'Greenwich'].map((area) => (
                  <div key={area} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`area-${area}`}
                      checked={newAreas.includes(area)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAreas([...newAreas, area]);
                        } else {
                          setNewAreas(newAreas.filter(a => a !== area));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`area-${area}`}>{area}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSchedule}>Create Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection Schedule</DialogTitle>
            <DialogDescription>
              Update the collection schedule and route
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-route">Route Name</Label>
              <Input 
                id="edit-route" 
                placeholder="e.g., London North" 
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pickup Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newPickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newPickupDate ? format(newPickupDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newPickupDate}
                    onSelect={setNewPickupDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Areas Covered</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Camden', 'Islington', 'Haringey', 'Hackney', 'Westminster', 'Croydon', 'Bromley', 'Greenwich'].map((area) => (
                  <div key={area} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-area-${area}`}
                      checked={newAreas.includes(area)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAreas([...newAreas, area]);
                        } else {
                          setNewAreas(newAreas.filter(a => a !== area));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`edit-area-${area}`}>{area}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSchedule}>Update Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CollectionScheduleTab;
