import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCountry } from '@/contexts/AdminCountryContext';
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
  Info,
  Edit,
  Hash
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RouteData {
  id: string;
  route: string;
  areas: string[];
  postcodes?: string[];
  pickup_date: string;
  created_at: string;
  updated_at: string;
  country?: string;
}

const RouteManagementTab = () => {
  const { toast } = useToast();
  const { selectedCountry } = useAdminCountry();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for new/edit route
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteAreas, setNewRouteAreas] = useState('');
  const [newRoutePostcodes, setNewRoutePostcodes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Available predefined routes for quick selection - England
  const predefinedEnglandRoutes = [
    'LONDON',
    'LEEDS',
    'MANCHESTER',
    'BIRMINGHAM',
    'NOTTINGHAM',
    'CARDIFF',
    'BOURNEMOUTH',
    'SOUTHEND',
    'NORTHAMPTON',
    'BRIGHTON'
  ];

  // Available predefined routes for quick selection - Ireland
  const predefinedIrelandRoutes = [
    'LONDONDERRY',
    'BELFAST',
    'CAVAN',
    'ATHLONE',
    'LIMERICK',
    'DUBLIN CITY',
    'CORK'
  ];

  // England routes with their cities and postcodes (for seeding)
  const englandRoutesData: { route: string; cities: string[]; postcodes: string[] }[] = [
    {
      route: 'LONDON',
      cities: ['Central London', 'East London', 'West London', 'North London', 'South London'],
      postcodes: ['EC', 'WC', 'N', 'NW', 'E', 'SE', 'SW', 'W', 'EN', 'IG', 'RM', 'DA', 'BR', 'UB', 'HA', 'WD']
    },
    {
      route: 'BIRMINGHAM',
      cities: ['Birmingham', 'Coventry', 'Wolverhampton', 'Dudley', 'Walsall', 'Worcester', 'Shrewsbury', 'Telford'],
      postcodes: ['B', 'CV', 'WV', 'DY', 'WS', 'WR', 'SY', 'TF']
    },
    {
      route: 'MANCHESTER',
      cities: ['Manchester', 'Liverpool', 'Warrington', 'Oldham', 'Stockport', 'Stoke', 'Blackburn', 'Preston', 'Blackpool', 'Bolton', 'Wigan', 'Crewe', 'Chester'],
      postcodes: ['M', 'L', 'WA', 'OL', 'SK', 'ST', 'BB', 'PR', 'FY', 'BL', 'WN', 'CW', 'CH', 'LL']
    },
    {
      route: 'LEEDS',
      cities: ['Leeds', 'Wakefield', 'Halifax', 'Doncaster', 'Sheffield', 'Huddersfield', 'York', 'Bradford', 'Harrogate'],
      postcodes: ['LS', 'WF', 'HX', 'DN', 'S', 'HD', 'YO', 'BD', 'HG']
    },
    {
      route: 'CARDIFF',
      cities: ['Cardiff', 'Gloucester', 'Bristol', 'Swindon', 'Bath', 'Salisbury', 'Newport', 'Swansea'],
      postcodes: ['CF', 'GL', 'BS', 'SN', 'BA', 'SP', 'NP', 'SA']
    },
    {
      route: 'BOURNEMOUTH',
      cities: ['Southampton', 'Portsmouth', 'Reading', 'Guildford', 'Bournemouth', 'Oxford'],
      postcodes: ['SO', 'PO', 'RG', 'GU', 'BH', 'OX']
    },
    {
      route: 'NOTTINGHAM',
      cities: ['Nottingham', 'Leicester', 'Derby', 'Peterborough', 'Lincoln'],
      postcodes: ['NG', 'LE', 'DE', 'PE', 'LN']
    },
    {
      route: 'BRIGHTON',
      cities: ['Brighton', 'Redhill', 'Slough', 'Tunbridge Wells', 'Canterbury', 'Croydon', 'Twickenham', 'Kingston', 'Maidstone'],
      postcodes: ['BN', 'RH', 'SL', 'TN', 'CT', 'CR', 'TW', 'KT', 'ME']
    },
    {
      route: 'SOUTHEND',
      cities: ['Norwich', 'Ipswich', 'Colchester', 'Chelmsford', 'Cambridge', 'Southend', 'Stevenage'],
      postcodes: ['NR', 'IP', 'CO', 'CM', 'CB', 'SS', 'SG']
    },
    {
      route: 'NORTHAMPTON',
      cities: ['Milton Keynes', 'Luton', 'St Albans', 'Hemel Hempstead', 'Northampton'],
      postcodes: ['MK', 'LU', 'AL', 'HP', 'NN']
    }
  ];

  // Ireland routes with their cities (for seeding)
  const irelandRoutesData: { route: string; cities: string[] }[] = [
    {
      route: 'LONDONDERRY',
      cities: ['Larne', 'Ballyclare', 'Ballymena', 'Ballymoney', 'Kilrea', 'Coleraine', 'Londonderry', 'Lifford', 'Omagh', 'Cookstown', 'Carrickfergus']
    },
    {
      route: 'BELFAST',
      cities: ['Belfast', 'Bangor', 'Comber', 'Lisburn', 'Newry', 'Newtownwards', 'Dunmurry', 'Lurgan', 'Portadown', 'Banbridge', 'Moy', 'Dungannon', 'Armagh']
    },
    {
      route: 'CAVAN',
      cities: ['Maynooth', 'Ashbourne', 'Swords', 'Skerries', 'Drogheda', 'Dundalk', 'Cavan', 'Virginia', 'Kells', 'Navan', 'Trim']
    },
    {
      route: 'ATHLONE',
      cities: ['Mullingar', 'Longford', 'Roscommon', 'Boyle', 'Sligo', 'Ballina', 'Swinford', 'Castlebar', 'Tuam', 'Galway', 'Athenry', 'Athlone']
    },
    {
      route: 'LIMERICK',
      cities: ['Newbridge', 'Portlaoise', 'Roscrea', 'Limerick', 'Ennis', 'Doolin', 'Loughrea', 'Ballinasloe', 'Tullamore']
    },
    {
      route: 'DUBLIN CITY',
      cities: ['Sandyford', 'Rialto', 'Ballymount', 'Cabra', 'Beaumont', 'Malahide', 'Portmarnock', 'Dalkey', 'Shankill', 'Bray', 'Dublin']
    },
    {
      route: 'CORK',
      cities: ['Cashel', 'Fermoy', 'Cork', 'Dungarvan', 'Waterford', 'New Ross', 'Wexford', 'Gorey', 'Greystones']
    }
  ];

  const [isSeedingIreland, setIsSeedingIreland] = useState(false);
  const [isSeedingEngland, setIsSeedingEngland] = useState(false);

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

  // Seed Ireland routes into the database
  const seedIrelandRoutes = async () => {
    setIsSeedingIreland(true);
    try {
      // Check which routes already exist
      const existingIrelandRoutes = routes
        .filter(r => r.country === 'Ireland')
        .map(r => r.route.toUpperCase());

      const routesToAdd = irelandRoutesData.filter(
        r => !existingIrelandRoutes.includes(r.route.toUpperCase())
      );

      if (routesToAdd.length === 0) {
        toast({
          title: 'Routes Already Exist',
          description: 'All Ireland routes are already in the database.',
        });
        setIsSeedingIreland(false);
        return;
      }

      // Insert new routes
      for (const routeData of routesToAdd) {
        const { error } = await supabase
          .from('collection_schedules')
          .insert({
            route: routeData.route,
            areas: routeData.cities,
            pickup_date: 'Not set',
            country: 'Ireland'
          });

        if (error) {
          console.error(`Error adding route ${routeData.route}:`, error);
        }
      }

      toast({
        title: 'Ireland Routes Added',
        description: `Successfully added ${routesToAdd.length} Ireland route(s) with their cities.`,
      });

      // Refresh routes
      await fetchRoutes();

    } catch (error: any) {
      console.error('Error seeding Ireland routes:', error);
      toast({
        title: 'Error',
        description: 'Failed to add Ireland routes: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSeedingIreland(false);
    }
  };

  // Seed England routes into the database
  const seedEnglandRoutes = async () => {
    setIsSeedingEngland(true);
    try {
      // Check which routes already exist
      const existingEnglandRoutes = routes
        .filter(r => r.country === 'England' || r.country === 'UK' || !r.country)
        .map(r => r.route.toUpperCase());

      const routesToAdd = englandRoutesData.filter(
        r => !existingEnglandRoutes.includes(r.route.toUpperCase())
      );

      if (routesToAdd.length === 0) {
        toast({
          title: 'Routes Already Exist',
          description: 'All England routes are already in the database.',
        });
        setIsSeedingEngland(false);
        return;
      }

      // Insert new routes
      for (const routeData of routesToAdd) {
        const { error } = await supabase
          .from('collection_schedules')
          .insert({
            route: routeData.route,
            areas: [...routeData.cities, `Postcodes: ${routeData.postcodes.join(', ')}`],
            pickup_date: 'Not set',
            country: 'England'
          });

        if (error) {
          console.error(`Error adding route ${routeData.route}:`, error);
        }
      }

      toast({
        title: 'England Routes Added',
        description: `Successfully added ${routesToAdd.length} England route(s) with cities and postcodes.`,
      });

      // Refresh routes
      await fetchRoutes();

    } catch (error: any) {
      console.error('Error seeding England routes:', error);
      toast({
        title: 'Error',
        description: 'Failed to add England routes: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSeedingEngland(false);
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
      const areasArray = newRouteAreas.split(',').map(area => area.trim()).filter(Boolean);
      // Parse postcodes from comma-separated string (for England)
      const postcodesArray = newRoutePostcodes.split(',').map(pc => pc.trim().toUpperCase()).filter(Boolean);

      // Combine areas with postcodes in format "City (PC1, PC2)"
      const combinedAreas = areasArray.map((area, index) => {
        if (postcodesArray.length > 0 && selectedCountry === 'England') {
          // If there are postcodes, append them to the areas
          return area;
        }
        return area;
      });

      const { data, error } = await supabase
        .from('collection_schedules')
        .insert({
          route: newRouteName.toUpperCase(),
          areas: [...combinedAreas, ...(postcodesArray.length > 0 ? [`Postcodes: ${postcodesArray.join(', ')}`] : [])],
          pickup_date: 'Not set', // Default - will be set in Collection Schedule tab
          country: selectedCountry
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
      setNewRoutePostcodes('');
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

  const handleEditRoute = (route: RouteData) => {
    setEditingRoute(route);
    // Parse areas - separate postcodes from cities
    const cities = route.areas.filter(a => !a.startsWith('Postcodes:'));
    const postcodesEntry = route.areas.find(a => a.startsWith('Postcodes:'));
    const postcodes = postcodesEntry ? postcodesEntry.replace('Postcodes: ', '') : '';

    setNewRouteName(route.route);
    setNewRouteAreas(cities.join(', '));
    setNewRoutePostcodes(postcodes);
    setIsEditDialogOpen(true);
  };

  const updateRoute = async () => {
    if (!editingRoute || !newRouteName.trim() || !newRouteAreas.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide route name and service areas',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const areasArray = newRouteAreas.split(',').map(area => area.trim()).filter(Boolean);
      const postcodesArray = newRoutePostcodes.split(',').map(pc => pc.trim().toUpperCase()).filter(Boolean);

      const { error } = await supabase
        .from('collection_schedules')
        .update({
          route: newRouteName.toUpperCase(),
          areas: [...areasArray, ...(postcodesArray.length > 0 ? [`Postcodes: ${postcodesArray.join(', ')}`] : [])],
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRoute.id);

      if (error) throw error;

      // Refresh routes
      await fetchRoutes();

      // Reset form and close dialog
      setNewRouteName('');
      setNewRouteAreas('');
      setNewRoutePostcodes('');
      setEditingRoute(null);
      setIsEditDialogOpen(false);

      toast({
        title: 'Route updated',
        description: 'Route has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error updating route:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update route',
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
  
  // Filter routes based on search query and selected country from context
  const filteredRoutes = routes.filter(route => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      route.route.toLowerCase().includes(searchLower) ||
      route.areas.some(area => area.toLowerCase().includes(searchLower));
    // Handle routes without country field - default to England
    // Also match "UK" and "England" as the same
    const routeCountry = route.country || 'England';
    const matchesCountry =
      (selectedCountry === 'England' && (routeCountry === 'England' || routeCountry === 'UK' || !route.country)) ||
      (selectedCountry === 'Ireland' && routeCountry === 'Ireland');
    return matchesSearch && matchesCountry;
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

            {/* Seed Routes Button - show based on selected country */}
            {selectedCountry === 'Ireland' && (
              <Button
                variant="outline"
                onClick={seedIrelandRoutes}
                disabled={isSeedingIreland}
                className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
              >
                {isSeedingIreland ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Routes...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Add All Ireland Routes
                  </>
                )}
              </Button>
            )}

            {selectedCountry === 'England' && (
              <Button
                variant="outline"
                onClick={seedEnglandRoutes}
                disabled={isSeedingEngland}
                className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
              >
                {isSeedingEngland ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Routes...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Add All UK Routes
                  </>
                )}
              </Button>
            )}

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
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <Label className="text-sm text-gray-500">Creating route for:</Label>
                    <p className="font-semibold text-lg mt-1">
                      {selectedCountry === 'Ireland' ? '🇮🇪' : '🇬🇧'} {selectedCountry}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="routeName">Route Name</Label>
                    <Input
                      id="routeName"
                      placeholder={selectedCountry === 'Ireland' ? "e.g., DUBLIN CITY" : "e.g., LONDON"}
                      className="mt-1"
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-500">Quick Select ({selectedCountry}):</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(selectedCountry === 'Ireland' ? predefinedIrelandRoutes : predefinedEnglandRoutes).map((route) => (
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
                    <Label htmlFor="areas">Cities/Areas (comma separated)</Label>
                    <Input
                      id="areas"
                      placeholder={selectedCountry === 'Ireland' ? "e.g., Dublin, Cork, Galway" : "e.g., Brixton, Hackney, Camden"}
                      className="mt-1"
                      value={newRouteAreas}
                      onChange={(e) => setNewRouteAreas(e.target.value)}
                    />
                  </div>

                  {selectedCountry === 'England' && (
                    <div>
                      <Label htmlFor="postcodes" className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Postal Codes (comma separated)
                      </Label>
                      <Textarea
                        id="postcodes"
                        placeholder="e.g., SW1, SW2, SE1, NW1, E1, E2"
                        className="mt-1 min-h-[80px]"
                        value={newRoutePostcodes}
                        onChange={(e) => setNewRoutePostcodes(e.target.value.toUpperCase())}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        These postcodes will be used to auto-detect routes in the booking form
                      </p>
                    </div>
                  )}
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
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search routes or areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-sm font-medium">
                {selectedCountry === 'Ireland' ? '🇮🇪' : '🇬🇧'} {selectedCountry} Routes
              </span>
            </div>
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
                    <TableHead>Country</TableHead>
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          route.country === 'Ireland'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {route.country || 'England'}
                        </span>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoute(route)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Route Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingRoute(null);
          setNewRouteName('');
          setNewRouteAreas('');
          setNewRoutePostcodes('');
        }
        setIsEditDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
            <DialogDescription>
              Update route details. Changes will appear in the booking form and collection schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Label className="text-sm text-gray-500">Editing route for:</Label>
              <p className="font-semibold text-lg mt-1">
                {editingRoute?.country === 'Ireland' ? '🇮🇪' : '🇬🇧'} {editingRoute?.country || 'England'}
              </p>
            </div>

            <div>
              <Label htmlFor="editRouteName">Route Name</Label>
              <Input
                id="editRouteName"
                className="mt-1"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <Label htmlFor="editAreas">Cities/Areas (comma separated)</Label>
              <Input
                id="editAreas"
                className="mt-1"
                value={newRouteAreas}
                onChange={(e) => setNewRouteAreas(e.target.value)}
              />
            </div>

            {editingRoute?.country === 'England' && (
              <div>
                <Label htmlFor="editPostcodes" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Postal Codes (comma separated)
                </Label>
                <Textarea
                  id="editPostcodes"
                  placeholder="e.g., SW1, SW2, SE1, NW1, E1, E2"
                  className="mt-1 min-h-[80px]"
                  value={newRoutePostcodes}
                  onChange={(e) => setNewRoutePostcodes(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-gray-500 mt-1">
                  These postcodes will be used to auto-detect routes in the booking form
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateRoute} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteManagementTab;
