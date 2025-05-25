
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Eye, Reply, Check, X, RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface CustomQuote {
  id: string;
  phone_number: string;
  description: string;
  category?: string;
  specific_item?: string;
  image_urls: string[];
  status: string;
  quoted_amount?: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  name?: string;
  email?: string;
  sender_details?: any;
  recipient_details?: any;
}

const CustomQuoteManagement = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);
  const [quotedAmount, setQuotedAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async () => {
    if (!selectedQuote || !quotedAmount) {
      toast({
        title: 'Error',
        description: 'Please enter a quoted amount',
        variant: 'destructive',
      });
      return;
    }

    setIsResponding(true);
    
    try {
      const amount = parseFloat(quotedAmount);
      
      // Update the quote with the quoted amount
      const { error: quoteError } = await supabase
        .from('custom_quotes')
        .update({
          status: 'quoted',
          quoted_amount: amount,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedQuote.id);

      if (quoteError) throw quoteError;

      // Save quote amount to user profile if user_id exists
      if (selectedQuote.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            communication_preferences: {
              quoted_amount: amount,
              quote_id: selectedQuote.id,
              quote_date: new Date().toISOString()
            }
          })
          .eq('id', selectedQuote.user_id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          // Don't throw here as the main quote update was successful
        }
      }

      toast({
        title: 'Quote Sent',
        description: `Quote of £${amount} has been sent successfully`,
      });

      // Refresh quotes list
      await fetchQuotes();
      
      // Reset form
      setSelectedQuote(null);
      setQuotedAmount('');
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error sending quote:', error);
      toast({
        title: 'Error',
        description: `Failed to send quote: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('custom_quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Quote status updated to ${newStatus}`,
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'quoted':
        return <Badge className="bg-blue-100 text-blue-800">Quoted</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Custom Quote Management</h2>
        <Button onClick={fetchQuotes} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No custom quotes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {quote.name || 'Anonymous'} - {quote.phone_number}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(quote.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(quote.status)}
                    {quote.quoted_amount && (
                      <Badge variant="secondary">£{quote.quoted_amount}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{quote.description}</p>
                  </div>
                  
                  {quote.category && (
                    <div>
                      <h4 className="font-medium mb-1">Category</h4>
                      <p className="text-sm text-muted-foreground">{quote.category}</p>
                    </div>
                  )}
                  
                  {quote.specific_item && (
                    <div>
                      <h4 className="font-medium mb-1">Specific Item</h4>
                      <p className="text-sm text-muted-foreground">{quote.specific_item}</p>
                    </div>
                  )}

                  {quote.admin_notes && (
                    <div>
                      <h4 className="font-medium mb-1">Admin Notes</h4>
                      <p className="text-sm text-muted-foreground">{quote.admin_notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Quote Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Contact Information</Label>
                            <p>{quote.name || 'Anonymous'}</p>
                            <p>{quote.email || 'No email provided'}</p>
                            <p>{quote.phone_number}</p>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <p>{quote.description}</p>
                          </div>
                          {quote.category && (
                            <div>
                              <Label>Category</Label>
                              <p>{quote.category}</p>
                            </div>
                          )}
                          {quote.specific_item && (
                            <div>
                              <Label>Specific Item</Label>
                              <p>{quote.specific_item}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {quote.status === 'pending' && (
                      <Dialog open={selectedQuote?.id === quote.id} onOpenChange={(open) => {
                        if (!open) {
                          setSelectedQuote(null);
                          setQuotedAmount('');
                          setAdminNotes('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setSelectedQuote(quote)}
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Send Quote
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Quote Response</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="amount">Quoted Amount (£)</Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={quotedAmount}
                                onChange={(e) => setQuotedAmount(e.target.value)}
                                placeholder="Enter amount in pounds"
                              />
                            </div>
                            <div>
                              <Label htmlFor="notes">Admin Notes (Optional)</Label>
                              <Textarea
                                id="notes"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add any notes about this quote"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleSendQuote}
                              disabled={!quotedAmount || isResponding}
                            >
                              {isResponding ? 'Sending...' : 'Send Quote'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {quote.status === 'quoted' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(quote.id, 'accepted')}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark Accepted
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(quote.id, 'declined')}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Mark Declined
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomQuoteManagement;
