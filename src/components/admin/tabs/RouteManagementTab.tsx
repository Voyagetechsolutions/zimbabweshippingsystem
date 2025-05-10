
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
import { Badge } from '@/components/ui/badge';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { format, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Route, 
  PlusCircle, 
  Edit, 
  Trash2, 
  MapPin,
  CalendarIcon,
  Loader2,
  Check,
  Search
} from 'lucide-react';
import { formatDate } from '@/utils/formatters'; // Import the utility function

interface RouteData {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  created_at: string;
  updated_at: string;
}

const RouteManagementTab = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state for new route
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteAreas, setNewRouteAreas] = useState('');
  const [newRouteDate, setNewRouteDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit form state
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteAreas, setEditRouteAreas] = useState('');
  const [editRouteDate, setEditRouteDate] = useState<Date | undefined>(new Date());
  const [isEditing, setIsEditing] = useState(false);
  
  // Available predefined routes for quick selection
  const predefinedRoutes = [
    'London Route', 
    'Leeds Route', 
    'Manchester Route', 
    'Birmingham Route', 
    'Nottingham Route', 
    'Cardiff Route', 
    'Bournemouth Route', 
    'Southend Route', 
    'Northampton Route', 
    'Brighton Route', 
    'Scotland Route'
  ];

  useEffect(() => {
    fetchRoutes();
  }, []);
  
  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRoutes(data || []);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load route data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const createNewRoute = async () => {
    if (!newRouteName.trim() || !newRouteAreas.trim() || !newRouteDate) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Format date as string (YYYY-MM-DD)
      const formattedDate = format(newRouteDate, 'yyyy-MM-dd');
      
      // Parse areas from comma-separated string
      const areasArray = newRouteAreas.split(',').map(area => area.trim());
      
      const { data, error } = await supabase
        .from('collection_schedules')
        .insert({
          route: newRouteName,
          areas: areasArray,
          pickup_date: formattedDate
        })
        .select();
      
      if (error) throw error;
      
      // Update local state with the new route
      if (data && data.length > 0) {
        setRoutes(prevRoutes => [data[0], ...prevRoutes]);
      }
      
      // Reset form
      setNewRouteName('');
      setNewRouteAreas('');
      setNewRouteDate(new Date());
      
      toast({
        title: 'Route created',
        description: 'New route has been added successfully',
      });
    } catch (error: any) {
      console.error('Error creating route:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new route',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const updateRoute = async () => {
    if (!selectedRoute || !editRouteName.trim() || !editRouteAreas.trim() || !editRouteDate) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    
    setIsEditing(true);
    try {
      // Format date as string (YYYY-MM-DD)
      const formattedDate = format(editRouteDate, 'yyyy-MM-dd');
      
      // Parse areas from comma-separated string
      const areasArray = editRouteAreas.split(',').map(area => area.trim());
      
      const { data, error } = await supabase
        .from('collection_schedules')
        .update({
          route: editRouteName,
          areas: areasArray,
          pickup_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRoute.id)
        .select();
      
      if (error) throw error;
      
      // Update local state
      if (data && data.length > 0) {
        setRoutes(prevRoutes => 
          prevRoutes.map(route => 
            route.id === selectedRoute.id ? data[0] : route
          )
        );
      }
      
      // Reset form and close dialog
      setSelectedRoute(null);
      
      toast({
        title: 'Route updated',
        description: 'Route has been updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating route:', error);
      toast({
        title: 'Error',
        description: 'Failed to update route',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };
  
  const deleteRoute = async (id: string) => {
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setRoutes(prevRoutes => prevRoutes.filter(route => route.id !== id));
      
      toast({
        title: 'Route deleted',
        description: 'Route has been removed',
      });
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete route',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditRoute = (route: RouteData) => {
    setSelectedRoute(route);
    setEditRouteName(route.route);
    setEditRouteAreas(route.areas.join(', '));
    
    // Parse date string to Date object safely
    try {
      const parsedDate = new Date(route.pickup_date);
      if (isValid(parsedDate)) {
        setEditRouteDate(parsedDate);
      } else {
        console.warn(`Invalid pickup date: ${route.pickup_date}`);
        setEditRouteDate(new Date()); // Default to current date if invalid
      }
    } catch (error) {
      console.error(`Error parsing date: ${route.pickup_date}`, error);
      setEditRouteDate(new Date()); // Default to current date on error
    }
  };
  
  const selectPredefinedRoute = (routeName: string) => {
    setNewRouteName(routeName);
  };
  
  // Filter routes based on search query
  const filteredRoutes = routes.filter(route => {
    const searchLower = searchQuery.toLowerCase();
    return (
      route.route.toLowerCase().includes(searchLower) ||
      route.areas.some(area => area.toLowerCase().includes(searchLower))
    );
  });

  // Helper function to safely format dates
  const safeFormatDate = (dateStr: string | Date, formatStr: string = 'MMMM d, yyyy'): string => {
    try {
      if (!dateStr) return 'No date';
      
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      
      if (!isValid(date)) {
        console.warn(`Invalid date value: ${dateStr}`);
        return 'Invalid date';
      }
      
      return format(date, formatStr);
    } catch (error) {
      console.error(`Error formatting date: ${dateStr}`, error);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Route Management</CardTitle>
            <CardDescription>
              Configure shipping routes and collection schedules
            </CardDescription>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New Route
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Create New Route</SheetTitle>
                <SheetDescription>
                  Add a new collection route to the system
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="routeName">Route Name</Label>
                  <Input 
                    id="routeName" 
                    placeholder="e.g., London Route" 
                    className="mt-1"
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {predefinedRoutes.map((route) => (
                    <Badge
                      key={route}
                      variant="outline"
                      className={`cursor-pointer ${newRouteName === route ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => selectPredefinedRoute(route)}
                    >
                      {route}
                    </Badge>
                  ))}
                </div>
                
                <div>
                  <Label htmlFor="areas">Service Areas (comma separated)</Label>
                  <Input 
                    id="areas" 
                    placeholder="e.g., Brixton, Hackney, Camden" 
                    className="mt-1"
                    value={newRouteAreas}
                    onChange={(e) => setNewRouteAreas(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="pickupDate">Collection Date</Label>
                  <div className="flex mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRouteDate ? format(newRouteDate, 'PPP') : <span>Pick a date</span>}
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
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Cancel</Button>
                </SheetClose>
                <Button 
                  onClick={createNewRoute} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Route
                    </>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search routes or areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {filteredRoutes.length === 0 ? (
                <div className="text-center py-10">
                  <Route className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No routes found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery ? "Try adjusting your search" : "Create your first route to get started"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route Name</TableHead>
                        <TableHead>Areas</TableHead>
                        <TableHead>Collection Date</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoutes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Route className="h-4 w-4 mr-2 text-gray-500" />
                              {route.route}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {route.areas.map((area, i) => (
                                <Badge key={i} variant="outline" className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" /> {area}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {/* Safely display pickup date */}
                            {safeFormatDate(route.pickup_date, 'MMMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {safeFormatDate(route.updated_at, 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRoute(route)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Route</DialogTitle>
                                    <DialogDescription>
                                      Update route information and collection date
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedRoute && (
                                    <div className="grid gap-4 py-4">
                                      <div>
                                        <Label htmlFor="editRouteName">Route Name</Label>
                                        <Input 
                                          id="editRouteName" 
                                          className="mt-1"
                                          value={editRouteName}
                                          onChange={(e) => setEditRouteName(e.target.value)}
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor="editAreas">Service Areas (comma separated)</Label>
                                        <Input 
                                          id="editAreas" 
                                          className="mt-1"
                                          value={editRouteAreas}
                                          onChange={(e) => setEditRouteAreas(e.target.value)}
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor="editDate">Collection Date</Label>
                                        <div className="flex mt-1">
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal"
                                              >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editRouteDate ? format(editRouteDate, 'PPP') : <span>Pick a date</span>}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                mode="single"
                                                selected={editRouteDate}
                                                onSelect={setEditRouteDate}
                                                initialFocus
                                                className="pointer-events-auto"
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button 
                                      onClick={updateRoute} 
                                      disabled={isEditing}
                                    >
                                      {isEditing ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        'Save Changes'
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Route</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this route? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600"
                                      onClick={() => deleteRoute(route.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteManagementTab;
