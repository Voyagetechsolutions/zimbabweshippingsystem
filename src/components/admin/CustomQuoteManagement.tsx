
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/utils/formatters';

type CustomQuote = {
  id: string;
  user_id: string | null;
  shipment_id: string | null;
  status: string;
  phone_number: string;
  description: string;
  category: string | null;
  specific_item: string | null;
  image_urls: string[];
  quoted_amount: number | null;
  admin_notes: string | null;
  sender_details: any;
  recipient_details: any;
  created_at: string;
  updated_at: string;
  name: string | null;
  email: string | null;
};

type User = {
  email: string;
  id: string;
};

const CustomQuoteManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Fetch all quotes
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['adminQuotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomQuote[];
    },
  });

  // Mutation for updating quote
  const updateQuoteMutation = useMutation({
    mutationFn: async (updatedQuote: { id: string; status: string; quoted_amount?: number | null; admin_notes?: string | null }) => {
      const { data, error } = await supabase
        .from('custom_quotes')
        .update({
          status: updatedQuote.status,
          quoted_amount: updatedQuote.quoted_amount,
          admin_notes: updatedQuote.admin_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedQuote.id)
        .select();

      if (error) throw error;

      // If the status is 'quoted', send an email notification
      if (updatedQuote.status === 'quoted' && selectedQuote?.email) {
        try {
          await fetch(`https://oncsaunsqtekwwbzvvyh.supabase.co/functions/v1/send-quote-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`,
            },
            body: JSON.stringify({
              email: selectedQuote.email,
              phone_number: selectedQuote.phone_number,
              quoted_amount: updatedQuote.quoted_amount,
              item_description: selectedQuote.description,
              admin_notes: updatedQuote.admin_notes,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuotes'] });
      toast({
        title: 'Quote Updated',
        description: 'The quote has been successfully updated.',
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error updating quote:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update the quote. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleViewQuote = (quote: CustomQuote) => {
    setSelectedQuote(quote);
    setQuoteAmount(quote.quoted_amount?.toString() || '');
    setAdminNotes(quote.admin_notes || '');
    setIsDialogOpen(true);
  };

  const handleUpdateQuote = () => {
    if (!selectedQuote) return;

    const amount = quoteAmount ? parseFloat(quoteAmount) : null;

    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      status: 'quoted',
      quoted_amount: amount,
      admin_notes: adminNotes || null,
    });
  };

  const handleRejectQuote = () => {
    if (!selectedQuote) return;

    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      status: 'rejected',
      admin_notes: adminNotes || 'Quote request rejected',
    });
  };

  const filteredQuotes = React.useMemo(() => {
    if (!quotes) return [];

    switch (activeTab) {
      case 'pending':
        return quotes.filter(q => q.status === 'pending');
      case 'quoted':
        return quotes.filter(q => q.status === 'quoted');
      case 'all':
        return quotes;
      default:
        return quotes;
    }
  }, [quotes, activeTab]);

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Custom Quote Management</CardTitle>
        <CardDescription>Review and manage custom shipping quote requests</CardDescription>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="quoted">Quoted</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
          </div>
        ) : filteredQuotes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quoted Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(quote.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {quote.name || quote.email || 'Anonymous'}
                      <div className="text-xs text-muted-foreground">{quote.phone_number}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{quote.specific_item || quote.category || 'Custom Item'}</div>
                      <div className="text-xs line-clamp-1">{quote.description}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>
                      {quote.quoted_amount ? formatCurrency(quote.quoted_amount, 'GBP') : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewQuote(quote)}>
                        {quote.status === 'pending' ? 'Review' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No quotes found for the selected filter.</p>
          </div>
        )}

        {/* Quote Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Custom Quote Details</DialogTitle>
              <DialogDescription>
                {selectedQuote?.status === 'pending'
                  ? 'Review this request and provide a quote'
                  : 'View details for this quote request'}
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedQuote.status)}</div>
                  </div>
                  <div>
                    <Label>Date Requested</Label>
                    <div className="mt-1">{formatDate(selectedQuote.created_at)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Customer Information</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <div className="text-sm font-medium">{selectedQuote.name || 'Name not provided'}</div>
                      <div className="text-sm">{selectedQuote.email || 'Email not provided'}</div>
                      <div className="text-sm">{selectedQuote.phone_number}</div>
                    </div>
                  </div>

                  <div>
                    <Label>Item Details</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-sm font-medium">Category: </span>
                          <span className="text-sm">{selectedQuote.category || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Specific Item: </span>
                          <span className="text-sm">{selectedQuote.specific_item || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Description: </span>
                        <div className="text-sm whitespace-pre-wrap">{selectedQuote.description}</div>
                      </div>
                    </div>
                  </div>

                  {selectedQuote.image_urls && selectedQuote.image_urls.length > 0 && (
                    <div>
                      <Label>Images</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedQuote.image_urls.map((url, index) => (
                          <img 
                            key={index} 
                            src={url} 
                            alt={`Item image ${index + 1}`}
                            className="h-20 w-20 object-cover rounded-md border" 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="quoteAmount">Quote Amount (£)</Label>
                    <Input
                      id="quoteAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      className="mt-1"
                      disabled={selectedQuote.status !== 'pending'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="adminNotes">Admin Notes</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-1"
                      placeholder="Add notes about this quote (will be visible to customer)"
                      disabled={selectedQuote.status !== 'pending'}
                    />
                  </div>
                </div>

                <DialogFooter>
                  {selectedQuote.status === 'pending' ? (
                    <>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleRejectQuote}>
                        Reject
                      </Button>
                      <Button onClick={handleUpdateQuote} disabled={!quoteAmount}>
                        Send Quote
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Close
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CustomQuoteManagement;
