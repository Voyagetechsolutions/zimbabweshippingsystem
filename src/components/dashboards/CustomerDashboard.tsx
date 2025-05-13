
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RecentShipments } from '@/components/customer/RecentShipments';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Package, FileText, Bell, MapPin, DollarSign, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('shipments');
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  
  // Set active tab from location state if provided
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);
  
  // Fetch shipments for the user
  useEffect(() => {
    const fetchShipments = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        
        setShipments(data || []);
      } catch (error) {
        console.error('Error fetching shipments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchShipments();
  }, [user?.id]);
  
  // Fetch custom quotes for the user
  useEffect(() => {
    const fetchCustomQuotes = async () => {
      if (!user?.id) return;
      
      setLoadingQuotes(true);
      try {
        const { data, error } = await supabase
          .from('custom_quotes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setQuotes(data || []);
      } catch (error) {
        console.error('Error fetching custom quotes:', error);
      } finally {
        setLoadingQuotes(false);
      }
    };
    
    fetchCustomQuotes();
  }, [user?.id]);

  // Handle paying for a quote
  const handlePayQuote = (quote: any) => {
    if (!quote.quoted_amount) {
      alert('This quote does not have an amount yet. Please wait for the admin to provide a quote.');
      return;
    }
    
    // Navigate to booking form with quote data
    navigate('/book-shipment', {
      state: {
        fromCustomQuote: true,
        quoteData: quote,
        preFillData: {
          shipmentType: 'other',
          includeOtherItems: true,
          itemCategory: quote.category,
          otherItemDescription: quote.description,
          phone: quote.phone_number,
          // Fill in other fields if available from the sender/recipient details
          firstName: quote.sender_details?.name?.split(' ')?.[0] || '',
          lastName: quote.sender_details?.name?.split(' ')?.[1] || '',
          email: quote.sender_details?.email || user?.email || '',
          recipientName: quote.recipient_details?.name || '',
          recipientPhone: quote.recipient_details?.phone || '',
          quoteAmount: quote.quoted_amount,
        }
      }
    });
  };

  // Get color based on quote status
  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'quoted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your shipments and track your orders.
          </p>
        </div>
        
        <Button onClick={() => navigate('/book-shipment')} className="mt-4 md:mt-0 bg-zim-green hover:bg-zim-green/90">
          Book New Shipment
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="shipments" className="flex items-center">
            <Package className="w-4 h-4 mr-2" />
            My Shipments
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Custom Quotes
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments" className="mt-6">
          <RecentShipments shipments={shipments} loading={loading} />
        </TabsContent>
        
        <TabsContent value="quotes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Custom Quote Requests
              </CardTitle>
              <CardDescription>
                View and manage your custom shipping quote requests.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {loadingQuotes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : quotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium">No custom quotes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't requested any custom shipping quotes yet.
                  </p>
                  <Button 
                    onClick={() => navigate('/custom-quote-form')} 
                    className="mt-4 bg-zim-green hover:bg-zim-green/90"
                  >
                    Request a Custom Quote
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="border rounded-md p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{quote.category?.charAt(0).toUpperCase() + quote.category?.slice(1) || 'Custom Item'}</h3>
                            <Badge className={getQuoteStatusColor(quote.status)}>
                              {quote.status?.charAt(0).toUpperCase() + quote.status?.slice(1)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-500 mb-2">{quote.description}</p>
                          
                          <div className="text-xs text-gray-500">
                            Requested on {format(new Date(quote.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        
                        <div className="mt-3 md:mt-0">
                          {quote.quoted_amount ? (
                            <div className="flex flex-col items-end">
                              <div className="text-lg font-semibold text-green-700">
                                £{parseFloat(quote.quoted_amount).toFixed(2)}
                              </div>
                              
                              <Button 
                                onClick={() => handlePayQuote(quote)}
                                className="mt-2 bg-zim-green hover:bg-zim-green/90"
                                disabled={quote.status !== 'quoted'}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Pay Quote
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Awaiting quote...
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {quote.admin_notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
                          <strong>Admin Note:</strong> {quote.admin_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <div className="text-xs text-gray-500">
                Custom quotes are typically processed within 24-48 hours.
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/custom-quote-form')}
              >
                New Quote Request
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                View all your notifications and updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Notifications content */}
              <div className="text-center py-8 text-gray-500">
                Notifications will be displayed here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account details and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/account')}>
                View Account Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDashboard;
