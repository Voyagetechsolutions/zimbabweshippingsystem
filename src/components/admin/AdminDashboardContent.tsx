
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  TruckDelivery, 
  Calendar, 
  Users, 
  Search, 
  CircleDollarSign, 
  RefreshCcw 
} from 'lucide-react';
import { ShipmentMetadata } from '@/types/shipment';
import UserManagement from './UserManagement';

const AdminDashboardContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [shipments, setShipments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipments')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error Fetching Shipments',
        description: error.message || 'Failed to load shipments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
      toast({
        title: 'Error Fetching Quotes',
        description: error.message || 'Failed to load custom quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'shipments') {
      fetchShipments();
    }
    if (activeTab === 'overview' || activeTab === 'quotes') {
      fetchQuotes();
    }
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'pending payment':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuoteStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const recentShipments = shipments.slice(0, 5);
  const recentQuotes = quotes.slice(0, 5);

  const getSenderDetails = (shipment: any) => {
    if (!shipment.metadata) return { name: 'N/A', phone: 'N/A' };
    
    try {
      // Handle the case when metadata is a string (JSON)
      const metadata = typeof shipment.metadata === 'string' 
        ? JSON.parse(shipment.metadata) 
        : shipment.metadata as ShipmentMetadata;
      
      if (metadata.senderDetails) {
        return {
          name: metadata.senderDetails.name || 'N/A',
          phone: metadata.senderDetails.phone || 'N/A'
        };
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }
    
    return { name: 'N/A', phone: 'N/A' };
  };

  const getRecipientDetails = (shipment: any) => {
    if (!shipment.metadata) return { name: 'N/A', phone: 'N/A' };
    
    try {
      // Handle the case when metadata is a string (JSON)
      const metadata = typeof shipment.metadata === 'string' 
        ? JSON.parse(shipment.metadata) 
        : shipment.metadata as ShipmentMetadata;
      
      if (metadata.recipientDetails) {
        return {
          name: metadata.recipientDetails.name || 'N/A',
          phone: metadata.recipientDetails.phone || 'N/A'
        };
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }
    
    return { name: 'N/A', phone: 'N/A' };
  };

  const filteredShipments = shipments.filter(shipment => {
    const senderDetails = getSenderDetails(shipment);
    const recipientDetails = getRecipientDetails(shipment);
    const searchLower = searchTerm.toLowerCase();
    
    return (
      shipment.tracking_number?.toLowerCase().includes(searchLower) ||
      shipment.origin?.toLowerCase().includes(searchLower) ||
      shipment.destination?.toLowerCase().includes(searchLower) ||
      shipment.status?.toLowerCase().includes(searchLower) ||
      senderDetails.name.toLowerCase().includes(searchLower) ||
      senderDetails.phone.toLowerCase().includes(searchLower) ||
      recipientDetails.name.toLowerCase().includes(searchLower) ||
      recipientDetails.phone.toLowerCase().includes(searchLower) ||
      shipment.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      shipment.profiles?.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-zim-green" />
              <CardTitle className="text-base">Total Shipments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{shipments.length}</div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-zim-green" />
              <CardTitle className="text-base">Custom Quotes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quotes.length}</div>
            <p className="text-xs text-gray-500">Pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-zim-green" />
              <CardTitle className="text-base">Today's Shipments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {shipments.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-gray-500">New today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="quotes">Custom Quotes</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
                </div>
              ) : recentShipments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentShipments.map((shipment) => {
                        const senderDetails = getSenderDetails(shipment);
                        const recipientDetails = getRecipientDetails(shipment);
                        
                        return (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{senderDetails.name}</div>
                                <div className="text-gray-500 text-xs">{senderDetails.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{recipientDetails.name}</div>
                                <div className="text-gray-500 text-xs">{recipientDetails.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>{shipment.origin}</TableCell>
                            <TableCell>{shipment.destination}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(shipment.status)}`}>
                                {shipment.status}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(shipment.created_at)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No shipments found</div>
              )}
              {recentShipments.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => setActiveTab('shipments')}>View All Shipments</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Custom Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
                </div>
              ) : recentQuotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <div>
                              {quote.sender_details?.name || quote.profiles?.full_name || 'N/A'}
                              <div className="text-xs text-gray-500">
                                {quote.phone_number || quote.sender_details?.phone || 'No phone number'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{quote.category || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {quote.description || 'No description'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${getQuoteStatusClass(quote.status)}`}>
                              {quote.status || 'Pending'}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(quote.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No custom quotes found</div>
              )}
              {recentQuotes.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => setActiveTab('quotes')}>View All Quotes</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shipments Management</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchShipments}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search shipments by tracking number, status, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.length > 0 ? (
                        filteredShipments.map((shipment) => {
                          const senderDetails = getSenderDetails(shipment);
                          const recipientDetails = getRecipientDetails(shipment);
                          
                          return (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                              <TableCell>
                                {shipment.profiles?.full_name || 'No customer'}
                                <div className="text-xs text-gray-500">
                                  {shipment.profiles?.email || 'No email'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{senderDetails.name}</div>
                                  <div className="text-gray-500 text-xs">{senderDetails.phone}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{recipientDetails.name}</div>
                                  <div className="text-gray-500 text-xs">{recipientDetails.phone}</div>
                                </div>
                              </TableCell>
                              <TableCell>{shipment.origin}</TableCell>
                              <TableCell>{shipment.destination}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(shipment.status)}`}>
                                  {shipment.status}
                                </span>
                              </TableCell>
                              <TableCell>{formatDate(shipment.created_at)}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            {searchTerm ? "No shipments match your search criteria" : "No shipments found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          {/* CustomQuoteManagement component will be rendered here */}
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardContent;
