import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, RefreshCcw, Loader2, Phone, CheckCircle } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  deliveries_completed: number;
  avg_delivery_time: number;
  rating: number;
  active: boolean;
}

const DriverPerformanceTab = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Note: This assumes you'll create a 'drivers' table
      // For now, we'll show a placeholder
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('deliveries_completed', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error; // Ignore table doesn't exist error

      setDrivers(data || []);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      // Don't show error if table doesn't exist yet
      if (error.code !== 'PGRST116') {
        toast({
          title: 'Error',
          description: 'Failed to load driver data',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const addDriver = async () => {
    if (!newDriver.name || !newDriver.phone) {
      toast({
        title: 'Missing Information',
        description: 'Please provide driver name and phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingDriver(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .insert({
          name: newDriver.name,
          phone: newDriver.phone,
          deliveries_completed: 0,
          avg_delivery_time: 0,
          rating: 5.0,
          active: true
        });

      if (error) throw error;

      toast({
        title: 'Driver Added',
        description: `${newDriver.name} has been added successfully`,
      });

      setNewDriver({ name: '', phone: '' });
      fetchDrivers();
    } catch (error: any) {
      console.error('Error adding driver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add driver',
        variant: 'destructive',
      });
    } finally {
      setIsAddingDriver(false);
    }
  };

  const getPerformanceColor = (value: number) => {
    if (value >= 80) return 'text-green-600 dark:text-green-400';
    if (value >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Driver Performance</CardTitle>
            <CardDescription>
              Monitor driver efficiency and delivery metrics
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDrivers} 
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Driver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Driver</DialogTitle>
                  <DialogDescription>
                    Add a new driver to the delivery team
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Driver Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter driver name"
                      value={newDriver.name}
                      onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="Enter phone number"
                      value={newDriver.phone}
                      onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addDriver} disabled={isAddingDriver}>
                    {isAddingDriver ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>Add Driver</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border rounded-xl bg-gray-50 dark:bg-gray-900">
              <div className="text-4xl mb-3">👤</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No drivers found</h3>
              <p className="text-gray-500 dark:text-gray-400">There are currently no drivers in the system</p>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="mt-4">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New Driver
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Driver</DialogTitle>
                    <DialogDescription>
                      Add a new driver to the delivery team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Driver Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter driver name"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="Enter phone number"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addDriver} disabled={isAddingDriver}>
                      {isAddingDriver ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>Add Driver</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((driver) => {
                const performanceScore = Math.min(100, (driver.deliveries_completed / 200) * 100);
                
                return (
                  <Card key={driver.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{driver.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{driver.phone}</span>
                          </div>
                        </div>
                        <Badge variant={driver.active ? 'default' : 'secondary'}>
                          {driver.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 pb-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Deliveries</p>
                          <p className="font-semibold text-lg">{driver.deliveries_completed}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Avg Time</p>
                          <p className="font-semibold text-lg">{driver.avg_delivery_time.toFixed(1)} hrs</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Performance</span>
                          <span className={getPerformanceColor(performanceScore)}>
                            {performanceScore.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={performanceScore} className="h-2" />
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverPerformanceTab;
