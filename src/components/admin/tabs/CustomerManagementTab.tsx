
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  User,
  Search,
  MoreHorizontal,
  RefreshCw,
  Package,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Loader2
} from 'lucide-react';

interface Customer {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  role: string;
  is_admin: boolean;
  updated_at: string;
  avatar_url: string | null;
  shipment_count?: number;
}

interface Address {
  id: string;
  user_id: string;
  street_address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  recipient_name: string;
  address_name: string;
  created_at: string;
}

const CustomerManagementTab = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // View customer details state
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<Address[]>([]);
  const [customerShipments, setCustomerShipments] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles with customer role
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Now get shipment counts for each customer
      const customersWithCounts = await Promise.all((data || []).map(async (customer) => {
        // Get shipment count
        const { count, error: countError } = await supabase
          .from('shipments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', customer.id);
        
        if (countError) {
          console.error('Error fetching shipment count:', countError);
          return { ...customer, shipment_count: 0 };
        }
        
        return { ...customer, shipment_count: count || 0 };
      }));
      
      setCustomers(customersWithCounts);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerDetails = async (customer: Customer) => {
    setViewCustomer(customer);
    setLoadingDetails(true);
    
    try {
      // Fetch customer addresses
      const { data: addressData, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', customer.id)
        .order('is_default', { ascending: false });
      
      if (addressError) throw addressError;
      
      setCustomerAddresses(addressData || []);
      
      // Fetch customer shipments
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (shipmentError) throw shipmentError;
      
      setCustomerShipments(shipmentData || []);
      
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer details',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (customer.full_name && customer.full_name.toLowerCase().includes(searchLower)) ||
      customer.email.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'booking confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Booking Confirmed</Badge>;
      case 'ready for pickup':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Ready for Pickup</Badge>;
      case 'processing in uk warehouse':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">UK Warehouse</Badge>;
      case 'departed uk':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Departed UK</Badge>;
      case 'customs clearance':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Customs</Badge>;
      case 'processing in zw warehouse':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">ZW Warehouse</Badge>;
      case 'out for delivery':
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Out for Delivery</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Management</CardTitle>
        <CardDescription>View and manage customer accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={fetchCustomers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-10">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No customers found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? "Try adjusting your search" : "There are no customers in the system yet"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Shipments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center">
                          {customer.avatar_url ? (
                            <img
                              src={customer.avatar_url}
                              alt={customer.full_name || "User"}
                              className="rounded-full w-8 h-8 object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <span className="font-medium">
                          {customer.full_name || "Unnamed Customer"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell className="text-gray-500">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {customer.shipment_count} shipments
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => viewCustomerDetails(customer)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            Edit Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* View Customer Details Dialog */}
        {viewCustomer && (
          <Dialog open={!!viewCustomer} onOpenChange={(open) => !open && setViewCustomer(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
                <DialogDescription>
                  View complete information for {viewCustomer.full_name || viewCustomer.email}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Basic Info Section */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Basic Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-medium">{viewCustomer.full_name || "Not provided"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{viewCustomer.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Registered On</p>
                          <p className="font-medium">{format(new Date(viewCustomer.created_at), 'MMMM d, yyyy')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <Package className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Total Shipments</p>
                          <p className="font-medium">{viewCustomer.shipment_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Loading indicator for details */}
                {loadingDetails ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <>
                    {/* Addresses Section */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Saved Addresses</h3>
                      {customerAddresses.length === 0 ? (
                        <p className="text-gray-500 italic">No saved addresses</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {customerAddresses.map(address => (
                            <div 
                              key={address.id} 
                              className={`border rounded-lg p-3 ${address.is_default ? 'border-blue-400 bg-blue-50' : ''}`}
                            >
                              <div className="flex justify-between mb-2">
                                <span className="font-medium">{address.address_name}</span>
                                {address.is_default && (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800">Default</Badge>
                                )}
                              </div>
                              
                              <div className="text-sm">
                                <p className="text-gray-700 mb-1">{address.recipient_name}</p>
                                <p className="text-gray-600">{address.street_address}</p>
                                <p className="text-gray-600">
                                  {address.city}{address.state ? `, ${address.state}` : ''} {address.postal_code || ''}
                                </p>
                                <p className="text-gray-600">{address.country}</p>
                              </div>
                              
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                Added {format(new Date(address.created_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Recent Shipments Section */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Recent Shipments</h3>
                      {customerShipments.length === 0 ? (
                        <p className="text-gray-500 italic">No shipments found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tracking #</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerShipments.slice(0, 5).map(shipment => (
                              <TableRow key={shipment.id}>
                                <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                                <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                                <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                                <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                                <TableCell>{format(new Date(shipment.created_at), 'MMM d, yyyy')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewCustomer(null)}>Close</Button>
                <Button>
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Customer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerManagementTab;
