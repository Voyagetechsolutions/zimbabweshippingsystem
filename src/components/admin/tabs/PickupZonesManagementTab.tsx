
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Plus, Edit, RefreshCcw } from 'lucide-react';

interface RouteItem {
  name: string;
  areas: string[];
  pickupDays: string[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Glasgow', 'Newcastle', 'Liverpool', 
  'Sheffield', 'Leeds', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast',
  'Nottingham', 'Southampton', 'Portsmouth', 'Oxford', 'Cambridge', 'York'
];

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state
  const [formRoute, setFormRoute] = useState('');
  const [formAreas, setFormAreas] = useState<string[]>([]);
  const [formPickupDays, setFormPickupDays] = useState<string[]>([]);
  const [formPickupDate, setFormPickupDate] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    // When selectedRoute changes, update the form values
    if (selectedRoute) {
      const route = routes.find(r => r.name === selectedRoute);
      if (route) {
        setFormRoute(route.name);
        setFormAreas(route.areas);
        setFormPickupDays(route.pickupDays);
      }
    }
  }, [selectedRoute, routes]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // Fetch routes from collection_schedules table
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('route', { ascending: true });
      
      if (error) throw error;
      
      // Transform the data into the expected format
      const routesData: RouteItem[] = data.map(item => ({
        name: item.route,
        areas: item.areas || [],
        pickupDays: [item.pickup_date]
      }));
      
      // Group by route name to combine areas
      const routeMap = new Map<string, RouteItem>();
      routesData.forEach(route => {
        if (routeMap.has(route.name)) {
          const existingRoute = routeMap.get(route.name)!;
          existingRoute.areas = [...new Set([...existingRoute.areas, ...route.areas])];
          existingRoute.pickupDays = [...new Set([...existingRoute.pickupDays, ...route.pickupDays])];
        } else {
          routeMap.set(route.name, route);
        }
      });
      
      setRoutes(Array.from(routeMap.values()));
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load routes data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (value: string) => {
    console.log("Route selected:", value);
    setSelectedRoute(value);
  };

  const handleSaveRoute = async () => {
    try {
      if (!formRoute || formAreas.length === 0 || !formPickupDate) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      if (isEditMode) {
        // Delete existing entries for this route before adding updated ones
        const { error: deleteError } = await supabase
          .from('collection_schedules')
          .delete()
          .eq('route', formRoute);
        
        if (deleteError) throw deleteError;
      }
      
      // Create new entry in collection_schedules
      const { error } = await supabase
        .from('collection_schedules')
        .insert({
          route: formRoute,
          areas: formAreas,
          pickup_date: formPickupDate
        });
      
      if (error) throw error;
      
      toast({
        title: isEditMode ? 'Route Updated' : 'Route Added',
        description: `${formRoute} has been ${isEditMode ? 'updated' : 'added'} successfully`,
      });
      
      // Refresh routes
      fetchRoutes();
      
      // Reset form and close dialog
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving route:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'add'} route`,
        variant: 'destructive',
      });
    }
  };

  const handleEditRoute = (routeName: string) => {
    const route = routes.find(r => r.name === routeName);
    if (route) {
      setFormRoute(route.name);
      setFormAreas(route.areas);
      setFormPickupDays(route.pickupDays);
      setFormPickupDate(route.pickupDays[0] || '');
      setIsEditMode(true);
      setDialogOpen(true);
    }
  };

  const resetForm = () => {
    setFormRoute('');
    setFormAreas([]);
    setFormPickupDays([]);
    setFormPickupDate('');
    setIsEditMode(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Pickup Zones</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchRoutes}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-zim-green hover:bg-zim-green/90" 
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Route
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Route' : 'Add New Route'}</DialogTitle>
                <DialogDescription>
                  Define a new pickup route with areas and schedule.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="route">Route Name</Label>
                  <Input
                    id="route"
                    placeholder="e.g., North London"
                    value={formRoute}
                    onChange={(e) => setFormRoute(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Areas Covered</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                    {UK_CITIES.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`area-${area}`} 
                          checked={formAreas.includes(area)} 
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormAreas([...formAreas, area]);
                            } else {
                              setFormAreas(formAreas.filter(a => a !== area));
                            }
                          }}
                        />
                        <label htmlFor={`area-${area}`} className="text-sm">{area}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pickupDate">Pickup Date</Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    value={formPickupDate}
                    onChange={(e) => setFormPickupDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-zim-green hover:bg-zim-green/90"
                  onClick={handleSaveRoute}
                >
                  {isEditMode ? 'Update Route' : 'Add Route'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Routes</CardTitle>
            <CardDescription>Select a route to view details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedRoute || ''} onValueChange={handleRouteSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route.name} value={route.name}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No routes defined yet</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Route Details</CardTitle>
            <CardDescription>
              {selectedRoute ? `Details for ${selectedRoute}` : 'Select a route to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedRoute ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Route Selected</h3>
                <p className="text-gray-500">
                  Select a route from the list to view its details
                </p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Areas Covered</h3>
                  <div className="flex flex-wrap gap-2">
                    {routes.find(r => r.name === selectedRoute)?.areas.map((area) => (
                      <Badge key={area} className="bg-blue-100 text-blue-800 border-blue-300">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Pickup Schedule</h3>
                  <div className="flex flex-wrap gap-2">
                    {routes.find(r => r.name === selectedRoute)?.pickupDays.map((day) => (
                      <Badge key={day} className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {day}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => handleEditRoute(selectedRoute)}
                >
                  <Edit className="h-4 w-4" /> Edit Route
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Routes</CardTitle>
          <CardDescription>Overview of all pickup routes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Routes Defined</h3>
              <p className="text-gray-500">
                Add your first pickup route to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Areas Covered</TableHead>
                    <TableHead>Pickup Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.name}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {route.areas.slice(0, 3).map((area) => (
                            <Badge key={area} className="bg-blue-100 text-blue-800 border-blue-300">
                              {area}
                            </Badge>
                          ))}
                          {route.areas.length > 3 && (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                              +{route.areas.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {route.pickupDays.map((day) => (
                            <Badge key={day} className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {day}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRoute(route.name)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PickupZonesManagementTab;
