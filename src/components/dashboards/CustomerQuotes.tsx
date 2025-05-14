
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { Quote, FileText, Phone, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CustomQuote = {
  id: string;
  status: string;
  description: string;
  category: string | null;
  specific_item: string | null;
  phone_number: string;
  quoted_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
};

const CustomerQuotes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: quotes, isLoading, refetch } = useQuery({
    queryKey: ['customerQuotes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as CustomQuote[];
    },
    enabled: !!user?.id
  });

  const handleBookQuote = async (quote: CustomQuote) => {
    if (quote.status !== 'quoted' || !quote.quoted_amount) {
      toast({
        title: "Cannot proceed",
        description: "This quote has not been approved yet or is missing price information.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Store the selected quote data in localStorage to use in the booking process
      localStorage.setItem('selectedQuote', JSON.stringify({
        id: quote.id,
        description: quote.description,
        category: quote.category || 'Custom Item',
        specificItem: quote.specific_item || quote.description,
        amount: quote.quoted_amount,
        adminNotes: quote.admin_notes
      }));
      
      // Navigate to the booking confirmation page
      navigate('/confirm-booking');
    } catch (error) {
      console.error('Error navigating to booking:', error);
      toast({
        title: "Error",
        description: "Failed to process quote booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Pending Review</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Reviewed</Badge>;
      case 'quoted':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Price Quoted</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-purple-600">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'reviewed':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'quoted':
        return <Quote className="h-5 w-5 text-green-500" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-purple-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <EmptyState 
        icon={<Quote className="h-12 w-12 text-gray-400" />}
        title="No Custom Quotes Yet"
        description="Submit a custom quote request to get started"
        action={
          <Button onClick={() => navigate('/book-shipment?custom=true')}>Request Quote</Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Quote Requests</CardTitle>
        <CardDescription>View and manage your custom shipping quote requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="border rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(quote.status)}
                  <h3 className="font-medium text-lg">
                    {quote.specific_item || quote.category || 'Custom Item'}
                  </h3>
                  {getStatusBadge(quote.status)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(quote.created_at)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p className="text-sm">{quote.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <p className="text-sm">{quote.category || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <p className="text-sm">{quote.phone_number}</p>
                </div>
              </div>
              
              {quote.status === 'quoted' && quote.quoted_amount && (
                <div className="bg-gray-50 p-3 rounded-md border mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Quoted Price:</h4>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(quote.quoted_amount, 'GBP')}
                      </p>
                    </div>
                    <Button onClick={() => handleBookQuote(quote)}>
                      Book Quote
                    </Button>
                  </div>
                  {quote.admin_notes && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium text-gray-500">Notes:</p>
                      <p className="text-sm">{quote.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {quote.status === 'pending' && (
                <div className="text-sm text-amber-600 italic">
                  Your quote request is being reviewed. We'll notify you when a price is available.
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerQuotes;
