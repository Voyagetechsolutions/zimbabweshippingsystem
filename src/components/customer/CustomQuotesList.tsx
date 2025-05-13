
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCcw, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

interface CustomQuote {
  id: string;
  created_at: string;
  updated_at: string;
  description: string;
  status: string;
  phone_number: string;
  category: string | null;
  specific_item: string | null;
  quoted_amount: number | null;
  admin_notes: string | null;
  payment_status: string | null;
}

const CustomQuotesList = () => {
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch quotes for the current user
  const fetchQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your custom quotes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQuotes();
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshing(true);
    fetchQuotes();
  };

  // Handle payment for a quote
  const handlePayQuote = (quote: CustomQuote) => {
    navigate('/book-shipment', { 
      state: { 
        customQuote: {
          id: quote.id,
          amount: quote.quoted_amount,
          description: quote.description,
          specificItem: quote.specific_item,
          category: quote.category
        } 
      } 
    });
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let icon = <Clock className="h-3 w-3 mr-1" />;
    
    switch(status.toLowerCase()) {
      case 'pending':
        variant = "outline";
        icon = <Clock className="h-3 w-3 mr-1" />;
        break;
      case 'reviewed':
        variant = "secondary";
        icon = <RefreshCcw className="h-3 w-3 mr-1" />;
        break;
      case 'quoted':
        variant = "default";
        icon = <DollarSign className="h-3 w-3 mr-1" />;
        break;
      case 'accepted':
        variant = "default";
        icon = <CheckCircle className="h-3 w-3 mr-1" />;
        break;
      case 'rejected':
        variant = "destructive";
        icon = <AlertCircle className="h-3 w-3 mr-1" />;
        break;
      case 'paid':
        variant = "secondary";
        icon = <CheckCircle className="h-3 w-3 mr-1" />;
        break;
      default:
        break;
    }
    
    return (
      <Badge variant={variant} className="capitalize flex items-center">
        {icon}
        {status}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Custom Quotes</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Custom Quotes</h2>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
      </div>
      
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>You haven't submitted any custom quotes yet.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/custom-quote-new')}
            >
              Request a Custom Quote
            </Button>
          </CardContent>
        </Card>
      ) : (
        quotes.map((quote) => (
          <Card key={quote.id} className="mb-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {quote.specific_item || quote.category || 'Custom Quote Request'}
                  </CardTitle>
                  <CardDescription>
                    Submitted on {formatDate(quote.created_at)}
                  </CardDescription>
                </div>
                {renderStatusBadge(quote.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{quote.description}</p>
                
                {quote.quoted_amount !== null && (
                  <div className="flex items-center mt-2">
                    <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                    <p className="font-semibold text-lg">
                      Quoted Amount: £{quote.quoted_amount.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {quote.admin_notes && (
                  <div className="bg-gray-50 p-3 rounded-md mt-2">
                    <p className="text-sm font-medium">Admin Notes:</p>
                    <p className="text-sm">{quote.admin_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {quote.status === 'quoted' && (
                <Button onClick={() => handlePayQuote(quote)}>
                  Pay Quote
                </Button>
              )}
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
};

export default CustomQuotesList;
