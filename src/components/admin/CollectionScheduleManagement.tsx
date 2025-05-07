import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RouteSchedule,
  collectionSchedules,
  updateRouteDate,
  addRoute,
  removeRoute,
  addAreaToRoute,
  removeAreaFromRoute,
  syncSchedulesWithDatabase,
  getRoutesByCountry
} from '@/data/collectionSchedule';

const CollectionScheduleManagement: React.FC = () => {
  const [schedules, setSchedules] = useState<RouteSchedule[]>([]);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDate, setNewRouteDate] = useState<Date | undefined>();
  const [newRouteAreas, setNewRouteAreas] = useState('');
  const [newRouteCountry, setNewRouteCountry] = useState<string>('England');
  const [newArea, setNewArea] = useState('');
  const [addingNewRoute, setAddingNewRoute] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const { toast } = useToast();

  // Load schedules from database
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

  // Filtered schedules based on country selection
  const filteredSchedules = countryFilter === 'All' 
    ? schedules
    : schedules.filter(schedule => schedule.country === countryFilter);

  // Handle date selection for a route - Improved to ensure dates are properly formatted and saved
  const handleDateSelect = async (route: string, date: Date | undefined) => {
    if (!date) return;
    
    // Format date as "1st of April", "2nd of April", etc.
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    const month = date.toLocaleString('default', { month: 'long' });
    const formattedDate = `${day < 10 ? '0' + day : day}${suffix} of ${month}`;
    
    setIsLoading(true);
    
    try {
      console.log(`Updating route ${route} to date: ${formattedDate}`);
      
      // Update the date in our collection using the fixed function
      const success = await updateRouteDate(route, formattedDate);
      
      if (success) {
        // Update local state
        setSchedules(prevSchedules => {
          return prevSchedules.map(schedule => {
            if (schedule.route === route) {
              return { ...schedule, date: formattedDate };
            }
            return schedule;
          });
        });
        
        setEditingRoute(null);
        setSelectedDate(undefined);
        
        toast({
          title: "Date Updated",
          description: `The collection date for ${route} has been updated to ${formattedDate}.`,
        });
        
        // Refresh schedules from database
        await syncSchedulesWithDatabase();
        setSchedules([...collectionSchedules]);
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
  };

  // Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Convert date string to Date object - Improved to handle special messages
  const parseRouteDate = (dateStr: string): Date | undefined => {
    // Handle empty date or special messages
    if (!dateStr || dateStr === "No date available" || dateStr.includes("contact support")) return undefined;
    
    // Extract the day and month from string like "21st of April" or "01st of July"
    const match = dateStr.match(/(\d+)(?:st|nd|rd|th) of (\w+)/);
    if (!match) return undefined;
    
    const day = parseInt(match[1], 10);
    const month = match[2];
    
    // Create a date object for the current year
    const date = new Date();
    date.setDate(day);
    
    // Map month name to month number (0-11)
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = months.findIndex(m => m.toLowerCase() === month.toLowerCase());
    if (monthIndex !== -1) {
      date.setMonth(monthIndex);
    }
    
    return date;
  };
  
  // Start editing a route
  const handleEditRoute = (route: string) => {
    const schedule = schedules.find(s => s.route === route);
    if (schedule) {
      setEditingRoute(route);
      setSelectedDate(parseRouteDate(schedule.date));
    }
  };

  // Add a new route
  const handleAddRoute = async () => {
    if (!newRouteName || !newRouteDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a route name and date.",
        variant: "destructive",
      });
      return;
    }
    
    // Format the new route date
    const day = newRouteDate.getDate();
    const suffix = getOrdinalSuffix(day);
    const month = newRouteDate.toLocaleString('default', { month: 'long' });
    const formattedDate = `${day < 10 ? '0' + day : day}${suffix} of ${month}`;
    
    // Parse areas from comma-separated string
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
      // Add the new route to the database
      const success = await addRoute(newRouteName.toUpperCase(), formattedDate, areas, newRouteCountry);
      
      if (success) {
        setSchedules([...collectionSchedules]);
        setAddingNewRoute(false);
        setNewRouteName('');
        setNewRouteDate(undefined);
        setNewRouteAreas('');
        setNewRouteCountry('England');
        
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
  };

  // Remove a route
  const handleRemoveRoute = async (route: string) => {
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
  };

  // Add an area to a route - FIXED to ensure immediate UI update
  const handleAddArea = async (route: string) => {
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
      console.log(`Adding area ${newArea} to route ${route}`);
      
      // Use the fixed function to add area
      const success = await addAreaToRoute(route, newArea.toUpperCase());
      
      if (success) {
        // Update local state immediately
        setSchedules(prevSchedules => {
          return prevSchedules.map(schedule => {
            if (schedule.route === route) {
              return { 
                ...schedule, 
                areas: [...schedule.areas, newArea.toUpperCase()]
              };
            }
            return schedule;
          });
        });
        
        setNewArea('');
        
        toast({
          title: "Area Added",
          description: `${newArea.toUpperCase()} has been added to ${route}.`,
        });
        
        // Refresh schedules from database
        await syncSchedulesWithDatabase();
        setSchedules([...collectionSchedules]);
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
  };

  // Remove an area from a route - FIXED to ensure immediate UI update
  const handleRemoveArea = async (route: string, area: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log(`Removing area ${area} from route ${route}`);
      
      // Use the fixed function to remove area
      const success = await removeAreaFromRoute(route, area);
      
      if (success) {
        // Update local state immediately
        setSchedules(prevSchedules => {
          return prevSchedules.map(schedule => {
            if (schedule.route === route) {
              return { 
                ...schedule, 
                areas: schedule.areas.filter(a => a !== area)
              };
            }
            return schedule;
          });
        });
        
        toast({
          title: "Area Removed",
          description: `${area} has been removed from ${route}.`,
        });
        
        // Refresh schedules from database
        await syncSchedulesWithDatabase();
        setSchedules([...collectionSchedules]);
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
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Collection Schedule Management</h2>
        <Button 
          onClick={() => setAddingNewRoute(true)} 
          className="bg-zim-green hover:bg-zim-green/90"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Route
        </Button>
      </div>

      {/* Country Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Filter by Country</label>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Countries</SelectItem>
            <SelectItem value="England">England</SelectItem>
            <SelectItem value="Ireland">Ireland</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      )}

      {/* Add new route form */}
      {addingNewRoute && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Collection Route</CardTitle>
            <CardDescription>Create a new collection route with areas and schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Select value={newRouteCountry} onValueChange={setNewRouteCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="England">England</SelectItem>
                    <SelectItem value="Ireland">Ireland</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
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
                  placeholder={newRouteCountry === 'England' 
                    ? "e.g., CENTRAL LONDON, HEATHROW, EAST LONDON" 
                    : "e.g., DUBLIN, CORK, GALWAY"}
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
                setNewRouteCountry('England');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddRoute} 
              className="bg-zim-green hover:bg-zim-green/90"
              disabled={isLoading}
            >
              Add Route
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Collection routes table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Areas</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.map((schedule) => (
              <TableRow key={schedule.route}>
                <TableCell className="font-medium">{schedule.route}</TableCell>
                <TableCell>{schedule.country || 'England'}</TableCell>
                <TableCell>
                  {editingRoute === schedule.route ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
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
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRoute(schedule.route)}
                        disabled={isLoading}
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
};

export default CollectionScheduleManagement;
