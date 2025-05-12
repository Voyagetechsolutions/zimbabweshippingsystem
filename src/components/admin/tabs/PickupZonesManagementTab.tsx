
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Icons
import { Plus, MapPin, RefreshCcw, Package, Truck, Calendar, User, Phone } from 'lucide-react';

interface RouteGroup {
  name: string;
  shipments: Shipment[];
}

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteGroup[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoute, setNewRoute] = useState('');

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      // Fetch all shipments
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('Fetched shipments:', data);
      const shipmentsData = data as Shipment[] || [];
      
      // Process shipments and group by route
      setShipments(shipmentsData);
      groupShipmentsByRoute(shipmentsData);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupShipmentsByRoute = (shipments: Shipment[]) => {
    // Map to store routes and their shipments
    const routeMap = new Map<string, Shipment[]>();
    
    shipments.forEach(shipment => {
      // Extract route from collection details in metadata
      const metadata = shipment.metadata || {};
      const collectionDetails = metadata.collectionDetails || metadata.collection || {};
      const route = collectionDetails.route;
      
      if (route) {
        if (!routeMap.has(route)) {
          routeMap.set(route, []);
        }
        routeMap.get(route)?.push(shipment);
      }
    });
    
    // Convert map to array of route groups
    const routeGroups: RouteGroup[] = [];
    routeMap.forEach((shipments, name) => {
      routeGroups.push({ name, shipments });
    });
    
    // Sort route groups alphabetically
    routeGroups.sort((a, b) => a.name.localeCompare(b.name));
    
    setRoutes(routeGroups);
  };

  const addNewRoute = () => {
    if (!newRoute.trim()) return;
    
    // Check if route already exists
    if (routes.some(r => r.name.toLowerCase() === newRoute.trim().toLowerCase())) {
      toast({
        title: 'Route already exists',
        description: `Route "${newRoute}" is already in the list`,
        variant: 'destructive',
      });
      return;
    }
    
    // Add new empty route
    setRoutes([...routes, { name: newRoute.trim(), shipments: [] }]);
    setNewRoute('');
  };

  // Helper function to extract sender's name from metadata
  const getSenderName = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Name Provided';
    }
    
    const metadata = shipment.metadata;
    
    // First check senderDetails which should be our primary path
    if (metadata.senderDetails) {
      if (metadata.senderDetails.firstName && metadata.senderDetails.lastName) {
        return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
      }
      if (metadata.senderDetails.name) {
        return metadata.senderDetails.name;
      }
    }
    
    // Then check sender which is the second most common path
    if (metadata.sender) {
      if (metadata.sender.firstName && metadata.sender.lastName) {
        return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
      }
      if (metadata.sender.name) {
        return metadata.sender.name;
      }
    }
    
    return 'No Name Provided';
  };

  // Helper function to extract sender's phone from metadata
  const getSenderPhone = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Phone Provided';
    }
    
    const metadata = shipment.metadata;
    
    if (metadata.senderDetails?.phone) {
      return metadata.senderDetails.phone;
    }
    
    if (metadata.sender?.phone) {
      return metadata.sender.phone;
    }
    
    return 'No Phone Provided';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pickup Zones Management</CardTitle>
          <CardDescription>View and manage collection routes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2 flex-grow">
              <Input
                placeholder="Enter new route name..."
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewRoute()}
              />
              <Button onClick={addNewRoute}>
                <Plus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </div>
            <Button variant="outline" onClick={fetchShipments} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No routes found</h3>
              <p className="text-muted-foreground">Add a route to get started</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {routes.map((route, index) => (
                <AccordionItem key={route.name} value={`route-${index}`}>
                  <AccordionTrigger className="hover:bg-gray-50 px-4">
                    <div className="flex items-center gap-4">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div className="flex-grow text-left">
                        <span className="font-medium">{route.name}</span>
                        <Badge className="ml-2" variant="outline">{route.shipments.length} shipments</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {route.shipments.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2" />
                        <p>No shipments in this route</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tracking #</TableHead>
                              <TableHead>Customer Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Collection Date</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {route.shipments.map(shipment => {
                              const metadata = shipment.metadata || {};
                              const collectionDetails = metadata.collectionDetails || metadata.collection || {};
                              const senderDetails = metadata.senderDetails || metadata.sender || {};
                              
                              return (
                                <TableRow key={shipment.id}>
                                  <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-500" />
                                      <span>{getSenderName(shipment)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-gray-500" />
                                      <span>{getSenderPhone(shipment)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-500" />
                                      <span>{collectionDetails.date || 'Not scheduled'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-gray-500" />
                                      <span className="truncate max-w-[200px]">{shipment.origin}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{shipment.status}</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PickupZonesManagementTab;
