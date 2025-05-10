import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Driver } from '@/types/driver';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { getAllDriversWithPerformance, updateDriverPerformanceMetrics } from '@/utils/driverUtils';

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCcw, Search, TruckIcon, PackageIcon, CheckCircle, XCircle, StarIcon
} from 'lucide-react';

const DeliveryManagementTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchDrivers();
  }, []);
  
  useEffect(() => {
    filterDrivers();
  }, [drivers, searchQuery]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllDriversWithPerformance();
      
      if (error) throw error;
      
      if (data) {
        setDrivers(data);
        setFilteredDrivers(data);
      }
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const refreshDriverMetrics = async (driverId: string) => {
    try {
      const { data, error } = await updateDriverPerformanceMetrics(driverId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Driver metrics updated successfully',
      });
      
      // Refresh all drivers data
      await fetchDrivers();
      
    } catch (error: any) {
      console.error('Error updating driver metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to update driver metrics',
        variant: 'destructive'
      });
    }
  };
  
  const filterDrivers = () => {
    if (!searchQuery) {
      setFilteredDrivers(drivers);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = drivers.filter(driver => 
      (driver.name && driver.name.toLowerCase().includes(query)) ||
      (driver.email && driver.email.toLowerCase().includes(query)) ||
      (driver.region && driver.region.toLowerCase().includes(query))
    );
    
    setFilteredDrivers(filtered);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Management</CardTitle>
          <CardDescription>Manage drivers and track delivery performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by name, email, or region"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline" 
              onClick={fetchDrivers}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No drivers found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search query" : "No drivers have been added yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Total Deliveries</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>On Time</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.email}</TableCell>
                      <TableCell>{driver.region}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PackageIcon className="h-4 w-4 text-gray-400" />
                          {driver.performance?.total_deliveries || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {driver.performance?.completed_deliveries || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                          {driver.performance?.on_time_deliveries || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StarIcon className="h-4 w-4 text-yellow-500" />
                          {driver.performance?.rating?.toFixed(1) || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshDriverMetrics(driver.id)}
                        >
                          Update Metrics
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

export default DeliveryManagementTab;
