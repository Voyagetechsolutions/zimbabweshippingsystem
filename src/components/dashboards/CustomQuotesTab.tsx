
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CustomQuote {
  id: string;
  description: string;
  status: string;
  quoted_amount: number | null;
  category: string | null;
  created_at: string;
  phone_number: string;
  image_urls: string[];
}

const CustomQuotesTab = () => {
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);
  const [viewImages, setViewImages] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    // Fetch custom quotes for the current user
    const fetchCustomQuotes = async () => {
      setLoading(true);
      try {
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
          description: 'Failed to load your custom quotes. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomQuotes();
    
    // Set up real-time subscription for updates
    const subscription = supabase
      .channel('custom_quotes_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'custom_quotes',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Received real-time update:', payload);
          fetchCustomQuotes();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, toast]);
  
  // Handle payment for approved quotes
  const handlePayQuote = (quote: CustomQuote) => {
    // Navigate to booking page with quote info
    navigate('/book-shipment', { 
      state: { 
        quoteData: quote,
        isCustomQuote: true,
        amount: quote.quoted_amount 
      } 
    });
  };
  
  // Render badge based on status
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Quotes</CardTitle>
          <CardDescription>No custom quotes found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't requested any custom quotes yet.</p>
            <Button onClick={() => navigate('/book-shipment')} className="bg-zim-green hover:bg-zim-green/90">
              Book a Shipment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Custom Quotes</h2>
          <p className="text-muted-foreground">View and manage your custom shipping quote requests</p>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
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
                  <TableCell>{formatDate(quote.created_at)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={quote.description}>
                    {quote.description}
                  </TableCell>
                  <TableCell>{renderStatusBadge(quote.status)}</TableCell>
                  <TableCell>
                    {quote.quoted_amount 
                      ? `£${quote.quoted_amount.toFixed(2)}` 
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setViewImages(false);
                        }}
                      >
                        View Details
                      </Button>
                      
                      {quote.status.toLowerCase() === 'approved' && quote.quoted_amount && (
                        <Button
                          size="sm"
                          className="bg-zim-green hover:bg-zim-green/90"
                          onClick={() => handlePayQuote(quote)}
                        >
                          Pay Quote
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Quote Details Dialog */}
      {selectedQuote && (
        <Dialog open={Boolean(selectedQuote)} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Quote Details</DialogTitle>
              <DialogDescription>
                Requested on {formatDate(selectedQuote.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                <p>{renderStatusBadge(selectedQuote.status)}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Category</h3>
                <p>{selectedQuote.category || 'Not specified'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Contact Phone</h3>
                <p>{selectedQuote.phone_number}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Quoted Amount</h3>
                <p>{selectedQuote.quoted_amount ? `£${selectedQuote.quoted_amount.toFixed(2)}` : 'Pending'}</p>
              </div>
            </div>
            
            <div className="mt-2">
              <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
              <p className="whitespace-pre-wrap mt-1">{selectedQuote.description}</p>
            </div>
            
            {selectedQuote.image_urls && selectedQuote.image_urls.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm text-muted-foreground">Images</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setViewImages(!viewImages)}
                  >
                    {viewImages ? 'Hide Images' : 'View Images'}
                  </Button>
                </div>
                
                {viewImages && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {selectedQuote.image_urls.map((url, index) => (
                      <div key={index} className="relative aspect-square">
                        <img 
                          src={url} 
                          alt={`Quote image ${index + 1}`} 
                          className="object-cover w-full h-full rounded-md border"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedQuote(null)}
              >
                Close
              </Button>
              
              {selectedQuote.status.toLowerCase() === 'approved' && selectedQuote.quoted_amount && (
                <Button
                  className="bg-zim-green hover:bg-zim-green/90"
                  onClick={() => handlePayQuote(selectedQuote)}
                >
                  Pay Quote (£{selectedQuote.quoted_amount.toFixed(2)})
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomQuotesTab;
