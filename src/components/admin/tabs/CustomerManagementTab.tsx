
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCcw, User, Mail, Package, MapPin } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  is_admin: boolean | null;
  shipment_count?: number;
  addresses?: any[];
}

const CustomerManagementTab = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch shipment counts for each user - using count() aggregate function
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('user_id, count(*)');
        
      if (shipmentError) throw shipmentError;
      
      // Convert the shipment data to a more usable format
      const shipmentCounts: Record<string, number> = {};
      if (shipmentData) {
        shipmentData.forEach((item: any) => {
          shipmentCounts[item.user_id] = parseInt(item.count);
        });
      }

      // Fetch addresses for each user
      const { data: addressData, error: addressError } = await supabase
        .from('addresses')
        .select('*');
        
      if (addressError) throw addressError;
      
      // Organize addresses by user_id
      const addressesByUser: Record<string, any[]> = {};
      if (addressData) {
        addressData.forEach((address: any) => {
          if (!addressesByUser[address.user_id]) {
            addressesByUser[address.user_id] = [];
          }
          addressesByUser[address.user_id].push(address);
        });
      }

      // Combine the data
      const customersWithDetails = profilesData?.map((profile: Customer) => ({
        ...profile,
        shipment_count: shipmentCounts[profile.id] || 0,
        addresses: addressesByUser[profile.id] || []
      }));

      setCustomers(customersWithDetails || []);
      setFilteredCustomers(customersWithDetails || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(customer => 
      (customer.full_name && customer.full_name.toLowerCase().includes(query)) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.role && customer.role.toLowerCase().includes(query))
    );
    
    setFilteredCustomers(filtered);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>View and manage all registered customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by name, email, or role"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline" 
              onClick={fetchCustomers}
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
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search query" : "No customers have registered yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Shipments</TableHead>
                    <TableHead>Addresses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.full_name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {customer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          customer.is_admin 
                            ? 'bg-purple-100 text-purple-800 border-purple-300' 
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }>
                          {customer.is_admin ? 'Admin' : customer.role || 'Customer'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(customer.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          {customer.shipment_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {customer.addresses?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // View customer details (would implement detailed view)
                            toast({
                              title: 'View Customer',
                              description: `Viewing details for ${customer.full_name || customer.email}`,
                            });
                          }}
                        >
                          View Details
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

export default CustomerManagementTab;
