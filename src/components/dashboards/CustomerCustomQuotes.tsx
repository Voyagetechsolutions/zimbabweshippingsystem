
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  MessageSquare, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  PoundSterling
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

const CustomerCustomQuotes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  useEffect(() => {
    fetchQuotes();
  }, []);
  
  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to view your quotes',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your custom quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
    setIsDetailsOpen(true);
    
    // Mark associated notification as read
    updateNotificationStatus(quote.id);
  };
  
  const updateNotificationStatus = async (quoteId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('related_id', quoteId)
        .eq('type', 'quote_response');
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  };
  
  const handleProceedToPayment = (quote: any) => {
    // Create a paymentData object similar to what would be expected on the payment page
    const paymentData = {
      shipment_id: quote.shipment_id,
      senderDetails: quote.sender_details || {},
      recipientDetails: quote.recipient_details || {},
      shipmentDetails: {
        type: 'custom',
        description: quote.description,
        category: quote.category,
        services: []
      },
      user_id: quote.user_id,
      custom_quote_id: quote.id,
      quoted_amount: quote.quoted_amount
    };
    
    // Store in localStorage to pass to payment page
    localStorage.setItem('customQuotePayment', JSON.stringify(paymentData));
    
    // Navigate to payment page
    navigate('/payment/custom-quote');
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Pending</Badge>;
      case 'quoted':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Quoted</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border border-red-300">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border border-gray-300">{status}</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Custom Quotes</CardTitle>
        <CardDescription>
          View and manage your custom shipping quote requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No quotes found</h3>
            <p className="text-gray-500 mb-4">
              You haven't requested any custom quotes yet.
            </p>
            <Button onClick={() => navigate('/book-shipment')} className="bg-zim-green hover:bg-zim-green/90">
              Request a Quote
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      {format(new Date(quote.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {quote.description}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quote.status)}
                    </TableCell>
                    <TableCell>
                      {quote.quoted_amount 
                        ? `£${quote.quoted_amount.toFixed(2)}` 
                        : quote.status === 'pending' 
                          ? <span className="text-yellow-600 text-sm flex items-center"><Clock className="h-3 w-3 mr-1" /> Waiting</span>
                          : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewQuote(quote)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {quote.status === 'quoted' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleProceedToPayment(quote)}
                          >
                            <PoundSterling className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Quote Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Custom Quote Details</DialogTitle>
              <DialogDescription>
                View the details and status of your quote request
              </DialogDescription>
            </DialogHeader>
            
            {selectedQuote && (
              <div className="py-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(selectedQuote.status)}
                    
                    {selectedQuote.status === 'quoted' && (
                      <span className="text-blue-600 text-sm flex items-center ml-2">
                        <CheckCircle className="h-4 w-4 mr-1" /> Quote ready
                      </span>
                    )}
                    
                    {selectedQuote.status === 'pending' && (
                      <span className="text-yellow-600 text-sm flex items-center ml-2">
                        <Clock className="h-4 w-4 mr-1" /> Awaiting quote
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Quote Amount</h3>
                  {selectedQuote.quoted_amount ? (
                    <p className="text-lg font-bold">£{selectedQuote.quoted_amount.toFixed(2)}</p>
                  ) : (
                    <p className="text-sm text-yellow-600 flex items-center">
                      <Clock className="h-4 w-4 mr-1" /> Waiting for price
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                  <p className="bg-gray-50 p-3 rounded border text-sm">
                    {selectedQuote.description}
                  </p>
                </div>
                
                {selectedQuote.image_urls && selectedQuote.image_urls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Images</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedQuote.image_urls.map((url: string, index: number) => (
                        <div key={index} className="relative">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={url} 
                              alt={`Item image ${index + 1}`} 
                              className="w-full h-24 object-cover rounded border"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedQuote.status === 'quoted' && (
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-zim-green hover:bg-zim-green/90"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        handleProceedToPayment(selectedQuote);
                      }}
                    >
                      <PoundSterling className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CustomerCustomQuotes;
