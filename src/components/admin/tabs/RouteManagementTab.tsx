import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
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
import { 
  Route, 
  PlusCircle, 
  Trash2, 
  MapPin,
  Loader2,
  Search,
  RefreshCcw,
  Calendar,
  Info
} from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Available predefined routes for quick selection
  const predefinedRoutes = [
    'LONDON', 
    'LEEDS', 
    'MANCHESTER', 
    'BIRMINGHAM', 
    'NOTTINGHAM', 
    'CARDIFF', 
    'BOURNEMOUTH', 
    'SOUTHEND', 
    'NORTHAMPTON', 
    'BRIGHTON', 
    'SCOTLAND'
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
        .order('route', { ascending: true });
      
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
    if (!newRouteName.trim() || !newRouteAreas.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide route name and service areas',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Parse areas from comma-separated string
      const areasArray = newRouteAreas.split(',').map(area => area.trim());
      
      const { data, error } = await supabase
        .from('collection_schedules')
        .insert({
          route: newRouteName.toUpperCase(),
          areas: areasArray,
          pickup_date: 'Not set' // Default - will be set in Collection Schedule tab
        })
        .select();
      
      if (error) throw error;
      
      // Update local state with the new route
      if (data && data.length > 0) {
        setRoutes(prevRoutes => [...prevRoutes, data[0]].sort((a, b) => a.route.localeCompare(b.route)));
      }
      
      // Reset form and close dialog
      setNewRouteName('');
      setNewRouteAreas('');
      setIsDialogOpen(false);
      
      toast({
        title: 'Route created',
        description: 'New route added. Set collection date in the Collection Schedule tab.',
      });
    } catch (error: any) {
      console.error('Error creating route:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create new route',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Route Management</h3>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Add and view shipping routes here. To <strong>update collection dates</strong>, go to the <strong>Collection Schedule</strong> tab.
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Routes</CardTitle>
            <CardDescription>
              View all shipping routes in the system
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRoutes} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Route
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Route</DialogTitle>
                  <DialogDescription>
                    Add a new collection route. You can set the collection date in the Collection Schedule tab.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="routeName">Route Name</Label>
                    <Input 
                      id="routeName" 
                      placeholder="e.g., LONDON" 
                      className="mt-1"
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value.toUpperCase())}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-500">Quick Select:</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {predefinedRoutes.map((route) => (
                        <Badge
                          key={route}
                          variant="outline"
                          className={`cursor-pointer text-center justify-center py-1 ${newRouteName === route ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'}`}
                          onClick={() => selectPredefinedRoute(route)}
                        >
                          {route}
                        </Badge>
                      ))}
                    </div>
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createNewRoute} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Route
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
          ) : filteredRoutes.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <Route className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No routes found</p>
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
                    <TableHead>Service Areas</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Route className="h-4 w-4 mr-2 text-green-600" />
                          {route.route}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {route.areas.slice(0, 3).map((area, i) => (
                            <Badge key={i} variant="outline" className="flex items-center text-xs">
                              <MapPin className="h-3 w-3 mr-1" /> {area}
                            </Badge>
                          ))}
                          {route.areas.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{route.areas.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={route.pickup_date === 'Not set' ? 'text-gray-400 italic' : ''}>
                            {route.pickup_date || 'Not set'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Route</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{route.route}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteRoute(route.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

export default RouteManagementTab;
