
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, X, Loader2, RefreshCcw } from 'lucide-react';

interface PickupZone {
  id: string;
  name: string;
  route: string;
  postcodes: string[];
}

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [zones, setZones] = useState<PickupZone[]>([]);
  const [newZone, setNewZone] = useState<Partial<PickupZone>>({
    name: '',
    route: '',
    postcodes: [],
  });
  const [newPostcode, setNewPostcode] = useState('');
  const [currentZones, setCurrentZones] = useState<PickupZone[]>([]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('route')
        .order('route');
      
      if (error) throw error;
      
      // Extract unique route names
      const uniqueRoutes = [...new Set(data?.map(item => item.route) || [])];
      setRoutes(uniqueRoutes);
      
      // For demo purposes, we'll create some zones
      // In a real implementation, these would come from a proper database table
      setZones([
        { id: '1', name: 'North London', route: 'London Route', postcodes: ['N1', 'N2', 'N3', 'N4', 'N5'] },
        { id: '2', name: 'South London', route: 'London Route', postcodes: ['SE1', 'SE2', 'SW1', 'SW2', 'SW3'] },
        { id: '3', name: 'East London', route: 'London Route', postcodes: ['E1', 'E2', 'E3', 'E4', 'E5'] },
        { id: '4', name: 'West London', route: 'London Route', postcodes: ['W1', 'W2', 'W3', 'W4', 'W5'] },
        { id: '5', name: 'Central Manchester', route: 'Manchester Route', postcodes: ['M1', 'M2', 'M3', 'M4'] },
        { id: '6', name: 'North Manchester', route: 'Manchester Route', postcodes: ['M8', 'M9', 'M25'] },
        { id: '7', name: 'Birmingham City', route: 'Birmingham Route', postcodes: ['B1', 'B2', 'B3', 'B4'] },
        { id: '8', name: 'Leeds North', route: 'Leeds Route', postcodes: ['LS1', 'LS2', 'LS3'] },
        { id: '9', name: 'Leeds South', route: 'Leeds Route', postcodes: ['LS10', 'LS11', 'LS12'] },
      ]);

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

  // Effect to filter zones when route changes
  useEffect(() => {
    if (selectedRoute) {
      setCurrentZones(zones.filter(zone => zone.route === selectedRoute));
      // Set the route for new zones as well
      setNewZone(prev => ({ ...prev, route: selectedRoute }));
    } else {
      setCurrentZones([]);
    }
  }, [selectedRoute, zones]);

  const handleAddZone = () => {
    if (!newZone.name || !newZone.route || newZone.postcodes?.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name, select a route, and add at least one postcode',
        variant: 'destructive',
      });
      return;
    }

    // Add the new zone with a randomly generated ID
    const id = Math.random().toString(36).substring(2, 10);
    const zoneToAdd = { ...newZone, id } as PickupZone;
    
    setZones(prev => [...prev, zoneToAdd]);
    setCurrentZones(prev => [...prev, zoneToAdd]);
    
    // Reset form
    setNewZone({ 
      name: '', 
      route: selectedRoute, // Keep the current route selected
      postcodes: [] 
    });

    toast({
      title: 'Zone Added',
      description: `${zoneToAdd.name} has been added to ${zoneToAdd.route}`,
    });
  };

  const handleAddPostcode = () => {
    if (!newPostcode) return;
    
    // Check if postcode already exists in the list
    if (newZone.postcodes?.includes(newPostcode)) {
      toast({
        title: 'Duplicate Postcode',
        description: 'This postcode is already in the list',
        variant: 'destructive',
      });
      return;
    }
    
    setNewZone(prev => ({
      ...prev,
      postcodes: [...(prev.postcodes || []), newPostcode]
    }));
    
    setNewPostcode('');
  };

  const handleRemovePostcode = (postcodeToRemove: string) => {
    setNewZone(prev => ({
      ...prev,
      postcodes: prev.postcodes?.filter(postcode => postcode !== postcodeToRemove) || []
    }));
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones(prev => prev.filter(zone => zone.id !== zoneId));
    setCurrentZones(prev => prev.filter(zone => zone.id !== zoneId));
    
    toast({
      title: 'Zone Removed',
      description: 'The pickup zone has been removed',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pickup Zones Management</CardTitle>
          <CardDescription>
            Configure pickup zones for collection routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Route Selection */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Select Route</CardTitle>
                  <CardDescription>
                    Choose a collection route to manage its zones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="route-select">Route</Label>
                      <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                        <SelectTrigger id="route-select">
                          <SelectValue placeholder="Select a route" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map(route => (
                            <SelectItem key={route} value={route}>
                              {route}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={fetchRoutes} 
                      disabled={loading}
                    >
                      <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh Routes
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Add Zone Form */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Add New Zone</CardTitle>
                  <CardDescription>
                    Create a new pickup zone for the selected route
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="zone-name">Zone Name</Label>
                      <Input 
                        id="zone-name"
                        placeholder="e.g., North London"
                        value={newZone.name}
                        onChange={(e) => setNewZone({...newZone, name: e.target.value})}
                        disabled={!selectedRoute}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Add Postcodes</Label>
                      <div className="flex space-x-2">
                        <Input 
                          id="postcode"
                          placeholder="e.g., N1"
                          value={newPostcode}
                          onChange={(e) => setNewPostcode(e.target.value)}
                          disabled={!selectedRoute}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPostcode();
                            }
                          }}
                        />
                        <Button 
                          onClick={handleAddPostcode}
                          disabled={!selectedRoute || !newPostcode}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Postcodes List</Label>
                      <div className="border rounded-md p-2 min-h-[100px]">
                        {newZone.postcodes?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {newZone.postcodes?.map((postcode) => (
                              <div key={postcode} className="flex items-center bg-muted px-2 py-1 rounded-md">
                                <span className="text-sm">{postcode}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-5 w-5 p-0 ml-1" 
                                  onClick={() => handleRemovePostcode(postcode)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-muted-foreground">No postcodes added</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleAddZone}
                      disabled={!selectedRoute || !newZone.name || !newZone.postcodes?.length}
                    >
                      Add Zone
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Current Zones */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Current Zones</CardTitle>
                  <CardDescription>
                    {selectedRoute 
                      ? `Zones for ${selectedRoute}` 
                      : "Select a route to see its zones"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedRoute ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <MapPin className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-gray-500">No route selected</p>
                    </div>
                  ) : currentZones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <MapPin className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-gray-500">No zones for this route</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentZones.map((zone) => (
                        <div key={zone.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{zone.name}</h4>
                              <p className="text-sm text-muted-foreground">{zone.route}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700" 
                              onClick={() => handleDeleteZone(zone.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Postcodes</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {zone.postcodes.map((postcode) => (
                                <div key={postcode} className="bg-muted text-xs px-2 py-0.5 rounded-md">
                                  {postcode}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PickupZonesManagementTab;
