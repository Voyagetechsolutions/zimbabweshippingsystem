
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

// Icons
import { 
  Search, 
  RefreshCcw,
  Filter,
  Eye,
  MapPin,
  User,
  Package,
  Phone,
  Mail
} from 'lucide-react';

const CustomerManagementTab = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [customerShipments, setCustomerShipments] = useState<any[]>([]);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Customers fetched:', data);
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    setLoadingDetails(true);
    try {
      // Fetch customer's shipments
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Fetch customer's addresses
      const { data: addresses, error: addressesError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (addressesError) throw addressesError;

      setCustomerShipments(shipments || []);
      setCustomerAddresses(addresses || []);
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer details: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleCustomerStatus = async (customerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Customer status has been ${!currentStatus ? 'activated' : 'suspended'}.`,
      });

      // Update the local state
      setCustomers(customers.map(customer => 
        customer.id === customerId 
          ? { ...customer, is_active: !currentStatus }
          : customer
      ));
    } catch (error: any) {
      console.error('Error updating customer status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update customer status: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter customers based on search and status filter
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      searchQuery === '' ||
      customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && customer.is_active !== false) ||
      (statusFilter === 'suspended' && customer.is_active === false);
    
    return matchesSearch && matchesStatus;
  });

  // Helper function to render status badge
  const renderStatusBadge = (isActive: boolean | null) => {
    if (isActive === false) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Management</CardTitle>
        <CardDescription>
          View and manage all customer accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <span>Status</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchCustomers}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Customers Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No customers found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => {
                    const phoneNumber = customer.communication_preferences?.phone || 'N/A';
                    
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          {customer.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{phoneNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {customer.role || 'customer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(customer.is_active)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(customer.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setViewingCustomer(customer);
                                fetchCustomerDetails(customer.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={customer.is_active !== false}
                              onCheckedChange={() => toggleCustomerStatus(customer.id, customer.is_active)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground mt-2">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </CardContent>

      {/* View Customer Details Dialog */}
      {viewingCustomer && (
        <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
          <DialogContent className="max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>
                {viewingCustomer.full_name || viewingCustomer.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                  <p>{viewingCustomer.full_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{viewingCustomer.email}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Role</h3>
                  <Badge variant="outline" className="capitalize">
                    {viewingCustomer.role || 'customer'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  {renderStatusBadge(viewingCustomer.is_active)}
                </div>
              </div>
              
              {/* Tabs for Shipments and Addresses */}
              <Tabs defaultValue="shipments">
                <TabsList>
                  <TabsTrigger value="shipments" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Shipment History</span>
                  </TabsTrigger>
                  <TabsTrigger value="addresses" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Address History</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Shipments Tab */}
                <TabsContent value="shipments" className="mt-4">
                  {loadingDetails ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : customerShipments.length === 0 ? (
                    <div className="text-center py-6">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <h3 className="text-base font-medium">No shipments found</h3>
                      <p className="text-sm text-muted-foreground">
                        This customer has not created any shipments yet.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tracking #</TableHead>
                            <TableHead>Origin</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerShipments.map(shipment => (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-mono text-sm">
                                {shipment.tracking_number}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {shipment.origin}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {shipment.destination}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{shipment.status}</Badge>
                              </TableCell>
                              <TableCell>
                                {format(new Date(shipment.created_at), 'dd MMM yyyy')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                
                {/* Addresses Tab */}
                <TabsContent value="addresses" className="mt-4">
                  {loadingDetails ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : customerAddresses.length === 0 ? (
                    <div className="text-center py-6">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <h3 className="text-base font-medium">No addresses found</h3>
                      <p className="text-sm text-muted-foreground">
                        This customer has not saved any addresses yet.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customerAddresses.map(address => (
                        <Card key={address.id}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                {address.address_name || 'Address'}
                              </CardTitle>
                              {address.is_default && (
                                <Badge>Default</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-start gap-2">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>{address.recipient_name}</div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>{address.street_address}, {address.city}{address.state ? `, ${address.state}` : ''}, {address.postal_code}, {address.country}</div>
                            </div>
                            {address.phone_number && (
                              <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>{address.phone_number}</div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  const email = viewingCustomer.email;
                  if (email) {
                    window.location.href = `mailto:${email}`;
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Customer
              </Button>
              <Button onClick={() => setViewingCustomer(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default CustomerManagementTab;
