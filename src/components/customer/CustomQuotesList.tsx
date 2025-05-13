
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CustomQuotesList = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
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
        toast({
          title: "Error loading quotes",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotes();
  }, [toast]);
  
  if (loading) {
    return <div>Loading quotes...</div>;
  }
  
  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Quotes</CardTitle>
          <CardDescription>You haven't requested any custom quotes yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Custom Quotes</CardTitle>
        <CardDescription>Quotes requested for special shipments</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {quotes.map((quote) => (
            <div key={quote.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{quote.shipment_description || 'Custom Quote'}</h3>
                  <p className="text-sm text-gray-500">
                    Requested on {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                    quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                    quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {quote.status?.charAt(0).toUpperCase() + quote.status?.slice(1) || 'Pending'}
                  </div>
                  {quote.amount && (
                    <p className="font-bold mt-1">£{quote.amount.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomQuotesList;
