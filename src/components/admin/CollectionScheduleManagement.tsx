import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  RouteSchedule,
  collectionSchedules,
  updateRouteDate,
  addRoute,
  removeRoute,
  addAreaToRoute,
  removeAreaFromRoute,
  syncSchedulesWithDatabase
} from '@/data/collectionSchedule';

const CollectionScheduleManagement: React.FC = React.memo(() => {
  const [schedules, setSchedules] = useState<RouteSchedule[]>([]);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDate, setNewRouteDate] = useState<Date | undefined>();
  const [newRouteAreas, setNewRouteAreas] = useState('');
  const [newArea, setNewArea] = useState('');
  const [addingNewRoute, setAddingNewRoute] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSchedules = async () => {
      setIsLoading(true);
      try {
        await syncSchedulesWithDatabase();
        setSchedules([...collectionSchedules]);
      } catch (error) {
        console.error('Failed to load collection schedules:', error);
        toast({
          title: "Error Loading Schedules",
          description: "Unable to load collection schedules. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSchedules();
  }, [toast]);

  const getOrdinalSuffix = useCallback((day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }, []);

  const parseRouteDate = useCallback((dateStr: string): Date | undefined => {
    if (!dateStr || dateStr === "No date available") return undefined;
    
    const match = dateStr.match(/(\d+)(?:st|nd|rd|th) of (\w+)/);
    if (!match) return undefined;
    
    const day = parseInt(match[1], 10);
    const month = match[2];
    
    const date = new Date();
    date.setDate(day);
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = months.findIndex(m => m.toLowerCase() === month.toLowerCase());
    if (monthIndex !== -1) {
      date.setMonth(monthIndex);
    }
    
    return date;
  }, []);

  const handleEditRoute = useCallback((route: string) => {
    const schedule = schedules.find(s => s.route === route);
    if (schedule) {
      setEditingRoute(route);
      setSelectedDate(parseRouteDate(schedule.date));
    }
  }, [schedules, parseRouteDate]);

  const handleDateSelect = useCallback(async (route: string, date: Date | undefined) => {
    if (!date) return;
    
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    const month = date.toLocaleString('default', { month: 'long' });
    const formattedDate = `${day}${suffix} of ${month}`;
    
    setIsLoading(true);
    
    try {
      const success = await updateRouteDate(route, formattedDate);
      
      if (success) {
        setSchedules([...collectionSchedules]);
        setEditingRoute(null);
        setSelectedDate(undefined);
        
        toast({
          title: "Date Updated",
          description: `The collection date for ${route} has been updated to ${formattedDate}.`,
        });
      } else {
        throw new Error("Failed to update date");
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast({
        title: "Error Updating Date",
        description: "An error occurred while updating the collection date.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, getOrdinalSuffix]);

  const handleAddRoute = useCallback(async () => {
    if (!newRouteName || !newRouteDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a route name and date.",
        variant: "destructive",
      });
      return;
    }
    
    const day = newRouteDate.getDate();
    const suffix = getOrdinalSuffix(day);
    const month = newRouteDate.toLocaleString('default', { month: 'long' });
    const formattedDate = `${day}${suffix} of ${month}`;
    
    const areas = newRouteAreas
      .split(',')
      .map(area => area.trim().toUpperCase())
      .filter(area => area.length > 0);
    
    if (areas.length === 0) {
      toast({
        title: "Missing Areas",
        description: "Please provide at least one area for the route.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await addRoute(newRouteName.toUpperCase(), formattedDate, areas);
      
      if (success) {
        setSchedules([...collectionSchedules]);
        setAddingNewRoute(false);
        setNewRouteName('');
        setNewRouteDate(undefined);
        setNewRouteAreas('');
        
        toast({
          title: "Route Added",
          description: `The route ${newRouteName.toUpperCase()} has been added successfully.`,
        });
      } else {
        throw new Error("A route with this name already exists");
      }
    } catch (error) {
      console.error('Error adding route:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while adding the route.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [newRouteName, newRouteDate, newRouteAreas, getOrdinalSuffix, toast]);

  const handleRemoveRoute = useCallback(async (route: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const success = await removeRoute(route);
      
      if (success) {
        setSchedules([...collectionSchedules]);
        toast({
          title: "Route Removed",
          description: `The route ${route} has been removed.`,
        });
      } else {
        throw new Error("Failed to remove route");
      }
    } catch (error) {
      console.error('Error removing route:', error);
      toast({
        title: "Error Removing Route",
        description: "An error occurred while removing the route.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, toast]);

  const handleAddArea = useCallback(async (route: string) => {
    if (!newArea || isLoading) {
      toast({
        title: "Missing Area Name",
        description: "Please enter an area name.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await addAreaToRoute(route, newArea.toUpperCase());
      
      if (success) {
        setSchedules([...collectionSchedules]);
        setNewArea('');
        toast({
          title: "Area Added",
          description: `${newArea.toUpperCase()} has been added to ${route}.`,
        });
      } else {
        throw new Error("Could not add area to route");
      }
    } catch (error) {
      console.error('Error adding area:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while adding the area.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [newArea, isLoading, toast]);

  const handleRemoveArea = useCallback(async (route: string, area: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const success = await removeAreaFromRoute(route, area);
      
      if (success) {
        setSchedules([...collectionSchedules]);
        toast({
          title: "Area Removed",
          description: `${area} has been removed from ${route}.`,
        });
      } else {
        throw new Error("Failed to remove area from route");
      }
    } catch (error) {
      console.error('Error removing area:', error);
      toast({
        title: "Error Removing Area",
        description: "An error occurred while removing the area from the route.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, toast]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Collection Schedule Management</h2>
        <Button 
          onClick={() => setAddingNewRoute(true)} 
          className="bg-zim-green hover:bg-zim-green/90"
          disabled={isLoading}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Route
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      )}

      {addingNewRoute && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Collection Route</CardTitle>
            <CardDescription>Create a new collection route with areas and schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Route Name</label>
                <Input 
                  value={newRouteName} 
                  onChange={(e) => setNewRouteName(e.target.value)} 
                  placeholder="e.g., LONDON ROUTE" 
                  className="uppercase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Collection Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newRouteDate ? format(newRouteDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newRouteDate}
                      onSelect={setNewRouteDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Areas (comma-separated)</label>
                <Input 
                  value={newRouteAreas} 
                  onChange={(e) => setNewRouteAreas(e.target.value)} 
                  placeholder="e.g., CENTRAL LONDON, HEATHROW, EAST LONDON"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter area names separated by commas
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setAddingNewRoute(false);
                setNewRouteName('');
                setNewRouteDate(undefined);
                setNewRouteAreas('');
              }}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddRoute} 
              className="bg-zim-green hover:bg-zim-green/90"
              disabled={isLoading}
              type="button"
            >
              Add Route
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Areas</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.route}>
                <TableCell className="font-medium">{schedule.route}</TableCell>
                <TableCell>
                  {editingRoute === schedule.route ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-[240px] justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => handleDateSelect(schedule.route, date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className={schedule.date ? "" : "text-gray-400"}>
                      {schedule.date || "No date available"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {schedule.areas.map((area) => (
                      <Badge key={area} className="mr-1 mb-1 bg-gray-200 text-gray-800 hover:bg-gray-300">
                        {area}
                        <button
                          onClick={() => handleRemoveArea(schedule.route, area)}
                          className="ml-1 text-gray-500 hover:text-red-500"
                          disabled={isLoading}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <div className="flex items-center mt-1">
                      <Input
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        placeholder="Add area"
                        className="h-8 text-sm mr-2 w-32"
                        disabled={isLoading}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddArea(schedule.route)}
                        className="h-8 px-2"
                        disabled={isLoading}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    {editingRoute === schedule.route ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRoute(null)}
                        disabled={isLoading}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRoute(schedule.route)}
                        disabled={isLoading}
                        type="button"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRoute(schedule.route)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={isLoading}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default CollectionScheduleManagement;
