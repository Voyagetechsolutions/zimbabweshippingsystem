
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, ArrowRight, Bell, Truck, Globe, History, Quote } from 'lucide-react';
import RecentShipments from '@/components/customer/RecentShipments';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [customQuotes, setCustomQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    location?.state?.activeTab || 'overview'
  );

  useEffect(() => {
    if (location?.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    
    if (location?.state?.quoteSubmitted) {
      toast({
        title: 'Quote Submitted',
        description: 'Your custom quote request has been submitted successfully.',
      });
    }
    
    if (user) {
      fetchCustomerData();
    }
  }, [user, location]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch shipments
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (shipmentError) throw shipmentError;
      
      // Fetch custom quotes
      const { data: quoteData, error: quoteError } = await supabase
        .from('custom_quotes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (quoteError) throw quoteError;
      
      setShipments(shipmentData || []);
      setCustomQuotes(quoteData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'quoted':
        return 'bg-green-500 hover:bg-green-600';
      case 'rejected':
        return 'bg-red-500 hover:bg-red-600';
      case 'paid':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handlePayQuote = (quote: any) => {
    navigate('/book-shipment', { 
      state: { 
        customQuoteData: quote,
        initialStep: 'payment',
        prefillData: {
          // Pre-fill with data from the quote
          includeDrums: false,
          includeOtherItems: true,
          itemCategory: quote.category || 'other',
          otherItemDescription: quote.description || '',
          firstName: quote.sender_details?.name?.split(' ')[0] || '',
          lastName: quote.sender_details?.name?.split(' ')[1] || '',
          email: quote.sender_details?.email || '',
          phone: quote.phone_number || '',
          quotedAmount: quote.quoted_amount || 0
        }
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Button onClick={() => navigate('/book-shipment')}>
          <Plus className="mr-2 h-4 w-4" />
          Book New Shipment
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="shipments" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            <span>Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-1.5">
            <Truck className="h-4 w-4" />
            <span>Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-1.5">
            <Quote className="h-4 w-4" />
            <span>Custom Quotes</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipments.filter(s => s.status !== 'Delivered').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Shipments in progress
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab('shipments')}>
                  <span>View Shipments</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Custom Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customQuotes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {customQuotes.filter(q => q.status === 'quoted').length} quotes awaiting your response
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab('quotes')}>
                  <span>View Quotes</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Delivered Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'Delivered').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully delivered shipments
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab('history')}>
                  <span>View History</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <RecentShipments shipments={shipments.slice(0, 3)} loading={loading} />
            {shipments.length > 3 && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setActiveTab('shipments')}>
                  View All Shipments
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="shipments">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Shipments</h2>
              <Button onClick={() => navigate('/book-shipment')}>
                <Plus className="mr-2 h-4 w-4" />
                Book New Shipment
              </Button>
            </div>
            <RecentShipments shipments={shipments} loading={loading} />
            
            {shipments.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Shipments Yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't booked any shipments yet. Get started by booking your first shipment.
                  </p>
                  <Button onClick={() => navigate('/book-shipment')}>
                    Book Your First Shipment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Tracking</CardTitle>
              <CardDescription>
                Track the status of your active shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shipments.filter(s => s.status !== 'Delivered').length > 0 ? (
                <div className="space-y-4">
                  {shipments
                    .filter(s => s.status !== 'Delivered')
                    .map((shipment) => (
                      <Card key={shipment.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between p-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">
                              Tracking Number: {shipment.tracking_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              From {shipment.origin} to {shipment.destination}
                            </div>
                          </div>
                          <div>
                            <Badge className="mb-2">{shipment.status}</Badge>
                            <div className="text-sm text-muted-foreground">
                              Last updated: {new Date(shipment.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/shipment/${shipment.id}`)}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Track Details
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Shipments</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any active shipments to track at the moment.
                  </p>
                  <Button onClick={() => navigate('/book-shipment')}>
                    Book New Shipment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Shipment History</CardTitle>
              <CardDescription>
                Review your completed shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shipments.filter(s => s.status === 'Delivered').length > 0 ? (
                <div className="space-y-4">
                  {shipments
                    .filter(s => s.status === 'Delivered')
                    .map((shipment) => (
                      <Card key={shipment.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between p-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">
                              Tracking Number: {shipment.tracking_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              From {shipment.origin} to {shipment.destination}
                            </div>
                          </div>
                          <div>
                            <Badge className="mb-2 bg-green-500">Delivered</Badge>
                            <div className="text-sm text-muted-foreground">
                              Delivered on: {new Date(shipment.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/shipment/${shipment.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No delivered shipments yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Custom Quote Requests</CardTitle>
              <CardDescription>
                Manage your custom shipping quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customQuotes.length > 0 ? (
                <div className="space-y-4">
                  {customQuotes.map((quote) => (
                    <Card key={quote.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row justify-between p-4 gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(quote.status)}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(quote.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {quote.category ? quote.category.charAt(0).toUpperCase() + quote.category.slice(1) : 'Custom Item'}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {quote.description}
                          </p>
                        </div>
                        <div className="md:text-right">
                          {quote.quoted_amount ? (
                            <div className="text-lg font-bold mb-2">
                              £{quote.quoted_amount}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground mb-2">
                              Awaiting quote
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/custom-quote-request', { state: { quoteId: quote.id } })}
                            >
                              View Details
                            </Button>
                            {quote.status === 'quoted' && (
                              <Button size="sm" onClick={() => handlePayQuote(quote)}>
                                Pay Quote
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Quote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Custom Quotes</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't requested any custom shipping quotes yet.
                  </p>
                  <Button onClick={() => navigate('/custom-quote-request')}>
                    Request Custom Quote
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/custom-quote-request')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Request New Custom Quote
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Stay updated with the latest information about your shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Notifications coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDashboard;
