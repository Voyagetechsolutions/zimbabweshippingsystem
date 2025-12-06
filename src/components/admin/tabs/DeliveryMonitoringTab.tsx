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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Package, 
  RefreshCcw, 
  Search, 
  MapPin, 
  Clock,
  Loader2 
} from 'lucide-react';

interface Delivery {
  id: string;
  tracking_number: string;
  recipient_name: string;
  status: string;
  last_location?: string;
  updated_at: string;
  shipment_id?: string;
  metadata?: any;
}

const DeliveryMonitoringTab = () => {
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('week');

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      // Fetch shipments as deliveries
      let query = supabase
        .from('shipments')
        .select('*')
        .order('updated_at', { ascending: false });

      // Apply time filter
      if (timeFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform shipments to delivery format
      const transformedDeliveries: Delivery[] = (data || []).map(shipment => ({
        id: shipment.id,
        tracking_number: shipment.tracking_number,
        recipient_name: shipment.metadata?.recipient?.name || 'Unknown',
        status: shipment.status,
        last_location: shipment.origin,
        updated_at: shipment.updated_at,
        shipment_id: shipment.id,
        metadata: shipment.metadata
      }));

      setDeliveries(transformedDeliveries);
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deliveries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch =
      delivery.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || delivery.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('delivered')) {
      return <Badge className="bg-green-100 text-green-800 border border-green-300">✓ Delivered</Badge>;
    }
    if (statusLower.includes('transit') || statusLower.includes('pickup')) {
      return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">🚚 In Transit</Badge>;
    }
    if (statusLower.includes('pending')) {
      return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">⏱ Pending</Badge>;
    }
    if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
      return <Badge className="bg-red-100 text-red-800 border border-red-300">✕ Failed</Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Delivery Monitoring</CardTitle>
            <CardDescription>
              Track and monitor all active deliveries in real-time
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDeliveries} 
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tracking # or recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="This Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border rounded-xl bg-gray-50 dark:bg-gray-900">
              <div className="text-4xl mb-3">📭</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No deliveries found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Location</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {delivery.tracking_number}
                      </TableCell>
                      <TableCell>{delivery.recipient_name}</TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{delivery.last_location || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {getTimeAgo(delivery.updated_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View Timeline
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

export default DeliveryMonitoringTab;
