
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, ClipboardList, Tag, Clock, FileCheck, ExternalLink } from 'lucide-react';

const CustomQuotesTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const fetchCustomQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
      toast({
        title: 'Error',
        description: 'Could not load your custom quotes',
        variant: 'destructive',
      });
      return [];
    }
  };
  
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['customerCustomQuotes'],
    queryFn: fetchCustomQuotes,
  });
  
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Reviewed</Badge>;
      case 'quoted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Quoted</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Accepted</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const handleBookQuote = (quote: any) => {
    navigate('/book-shipment', {
      state: { 
        quoteData: quote, 
        isCustomQuote: true 
      }
    });
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
        icon={<FileText className="h-12 w-12 text-gray-400" />}
        title="No Custom Quotes Yet"
        description="Request a custom quote for special items or large shipments"
        action={
          <Button onClick={() => navigate('/book-shipment')}>
            Book a Shipment
          </Button>
        }
      />
    );
  }
  
  return (
    <div className="space-y-4">
      {quotes.map((quote) => (
        <Card key={quote.id} className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-zim-green" />
                  {quote.category || 'Custom Quote'} {quote.specific_item ? `- ${quote.specific_item}` : ''}
                </CardTitle>
                <CardDescription>
                  Requested on {formatDate(quote.created_at)}
                </CardDescription>
              </div>
              {getStatusBadge(quote.status)}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="text-sm">{quote.description}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Contact Details</h4>
                  <p className="text-sm">
                    {quote.name || (quote.sender_details && (quote.sender_details as any).name)}<br />
                    {quote.email || (quote.sender_details && (quote.sender_details as any).email)}<br />
                    {quote.phone_number}
                  </p>
                </div>
              </div>
              
              {(quote.status === 'quoted' || quote.status === 'accepted') && quote.quoted_amount && (
                <div className="bg-green-50 p-4 rounded-md border border-green-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="text-green-800">Quote Amount</span>
                      </h4>
                      <p className="text-xl font-bold text-green-800">
                        {formatCurrency(quote.quoted_amount, 'GBP')}
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => handleBookQuote(quote)}
                      className="bg-zim-green hover:bg-zim-green/90"
                    >
                      Book This Quote
                    </Button>
                  </div>
                </div>
              )}
              
              {quote.status === 'pending' && (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Clock className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Waiting for quote</p>
                      <p className="text-sm">We'll notify you once your quote is ready</p>
                    </div>
                  </div>
                </div>
              )}
              
              {quote.admin_notes && (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                  <p className="text-sm text-gray-600">{quote.admin_notes}</p>
                </div>
              )}
              
              {quote.image_urls && quote.image_urls.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Images</h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {quote.image_urls.map((url: string, index: number) => (
                      <a 
                        key={index} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="relative group"
                      >
                        <div className="overflow-hidden border border-gray-200 rounded-md aspect-square">
                          <img 
                            src={url} 
                            alt={`Item image ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                          <ExternalLink className="text-white opacity-0 group-hover:opacity-100 h-6 w-6" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomQuotesTab;
