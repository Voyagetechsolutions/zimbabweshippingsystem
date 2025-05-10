
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  RefreshCcw,
  Calendar,
  Check,
  AlertCircle
} from 'lucide-react';

interface RouteEntry {
  id: string;
  route: string;
  areas: string[];
  has_schedules?: boolean;
}

const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Glasgow', 'Newcastle', 'Liverpool', 
  'Sheffield', 'Leeds', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast',
  'Nottingham', 'Southampton', 'Portsmouth', 'Oxford', 'Cambridge', 'York',
  'Leicester', 'Reading', 'Aberdeen', 'Bournemouth', 'Brighton', 'Milton Keynes'
];

const RouteManagementTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteEntry | null>(null);
  const [deleteRoute, setDeleteRoute] = useState<RouteEntry | null>(null);
  
  // Form state
  const [formRouteName, setFormRouteName] = useState('');
  const [formSelectedAreas, setFormSelectedAreas] = useState<string[]>([]);
  const [searchArea, setSearchArea] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // Fetch distinct routes from collection_schedules
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('id, route, areas')
        .order('route', { ascending: true });
      
      if (error) throw error;
      
      // Group routes by route name and combine areas
      const routeMap = new Map<string, RouteEntry>();
      
      data.forEach(entry => {
        const routeName = entry.route;
        
        if (!routeMap.has(routeName)) {
          routeMap.set(routeName, {
            id: entry.id,
            route: routeName,
            areas: [...entry.areas]
          });
        } else {
          // Merge areas from the same route
          const existingRoute = routeMap.get(routeName)!;
          const combinedAreas = [...new Set([...existingRoute.areas, ...entry.areas])];
          existingRoute.areas = combinedAreas;
        }
      });
      
      // Check if routes have schedules
      const routesWithSchedules = await Promise.all(
        Array.from(routeMap.values()).map(async (route) => {
          const { count, error: countError } = await supabase
            .from('collection_schedules')
            .select('id', { count: 'exact', head: true })
            .eq('route', route.route);
          
          if (!countError && count !== null) {
            route.has_schedules = count > 0;
          }
          
          return route;
        })
      );
      
      setRoutes(routesWithSchedules);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load routes data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = () => {
    setEditingRoute(null);
    setFormRouteName('');
    setFormSelectedAreas([]);
    setDialogOpen(true);
  };

  const handleEditRoute = (route: RouteEntry) => {
    setEditingRoute(route);
    setFormRouteName(route.route);
    setFormSelectedAreas([...route.areas]);
    setDialogOpen(true);
  };

  const handleDeleteRouteDialog = (route: RouteEntry) => {
    setDeleteRoute(route);
    setDeleteDialogOpen(true);
  };

  const handleSaveRoute = async () => {
    try {
      if (!formRouteName || formSelectedAreas.length === 0) {
        toast({
          title: 'Missing Information',
          description: 'Please provide a route name and select at least one area',
          variant: 'destructive'
        });
        return;
      }
      
      if (editingRoute) {
        // Update existing route
        // First, find all entries for this route
        const { data: routeEntries, error: fetchError } = await supabase
          .from('collection_schedules')
          .select('id')
          .eq('route', editingRoute.route);
          
        if (fetchError) throw fetchError;
        
        // If we're renaming the route, update all entries
        if (formRouteName !== editingRoute.route) {
          const { error: updateError } = await supabase
            .from('collection_schedules')
            .update({ route: formRouteName })
            .eq('route', editingRoute.route);
            
          if (updateError) throw updateError;
        }
        
        // Update areas for the first entry
        if (routeEntries && routeEntries.length > 0) {
          const { error: updateAreasError } = await supabase
            .from('collection_schedules')
            .update({ areas: formSelectedAreas })
            .eq('id', routeEntries[0].id);
            
          if (updateAreasError) throw updateAreasError;
        }
        
        toast({
          title: 'Route Updated',
          description: `${formRouteName} has been updated successfully`
        });
      } else {
        // Create new route
        const { error } = await supabase
          .from('collection_schedules')
          .insert({
            route: formRouteName,
            areas: formSelectedAreas,
            pickup_date: new Date().toISOString().split('T')[0] // Today as default pickup date
          });
        
        if (error) throw error;
        
        toast({
          title: 'Route Added',
          description: `${formRouteName} has been added successfully`
        });
      }
      
      // Close dialog and refresh
      setDialogOpen(false);
      fetchRoutes();
    } catch (error: any) {
      console.error('Error saving route:', error);
      toast({
        title: 'Error',
        description: 'Failed to save route: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRoute = async () => {
    if (!deleteRoute) return;
    
    try {
      // Delete all entries with this route name
      const { error } = await supabase
        .from('collection_schedules')
        .delete()
        .eq('route', deleteRoute.route);
      
      if (error) throw error;
      
      toast({
        title: 'Route Deleted',
        description: `${deleteRoute.route} has been deleted successfully`
      });
      
      // Close dialog and refresh
      setDeleteDialogOpen(false);
      fetchRoutes();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete route: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredCities = UK_CITIES.filter(city => 
    searchArea === '' || city.toLowerCase().includes(searchArea.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Route Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchRoutes}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            className="bg-zim-green hover:bg-zim-green/90 flex items-center gap-2"
            onClick={handleAddRoute}
          >
            <Plus className="h-4 w-4" />
            Add Route
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Routes Defined</h3>
            <p className="text-gray-500 mb-6 text-center">
              No collection routes have been created yet.
              <br />
              Add your first route to get started.
            </p>
            <Button
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={handleAddRoute}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Route
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Available Routes</CardTitle>
            <CardDescription>Manage collection routes and covered areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Areas Covered</TableHead>
                    <TableHead>Has Schedules</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.route}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {route.areas.slice(0, 5).map((area) => (
                            <Badge key={area} className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {area}
                            </Badge>
                          ))}
                          {route.areas.length > 5 && (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                              +{route.areas.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {route.has_schedules ? (
                          <div className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            <span>Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-yellow-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>No schedules</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoute(route)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRouteDialog(route)}
                            className="flex items-center gap-1 text-red-500"
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
      )}

      {/* Add/Edit Route Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? `Edit Route: ${editingRoute.route}` : 'Add New Route'}
            </DialogTitle>
            <DialogDescription>
              {editingRoute 
                ? 'Update the route details and covered areas' 
                : 'Define a new collection route'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">Route Name</Label>
              <Input
                id="routeName"
                value={formRouteName}
                onChange={(e) => setFormRouteName(e.target.value)}
                placeholder="e.g., North London"
              />
            </div>
            <div className="space-y-2">
              <Label>Areas Covered</Label>
              <Input
                placeholder="Search areas..."
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                {filteredCities.map((city) => (
                  <div key={city} className="flex items-center space-x-2">
                    <Checkbox
                      id={`area-${city}`}
                      checked={formSelectedAreas.includes(city)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormSelectedAreas([...formSelectedAreas, city]);
                        } else {
                          setFormSelectedAreas(formSelectedAreas.filter(a => a !== city));
                        }
                      }}
                    />
                    <label htmlFor={`area-${city}`} className="text-sm">
                      {city}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Selected {formSelectedAreas.length} of {UK_CITIES.length} areas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-zim-green hover:bg-zim-green/90" onClick={handleSaveRoute}>
              {editingRoute ? 'Update Route' : 'Add Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Route Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this route? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {deleteRoute && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Warning</span>
                </div>
                
                <p>
                  You are about to delete the route: <span className="font-bold">{deleteRoute.route}</span>
                </p>
                
                {deleteRoute.has_schedules && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-800">
                    <p className="text-sm">
                      This route has associated collection schedules that will also be deleted.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteRoute}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteManagementTab;
