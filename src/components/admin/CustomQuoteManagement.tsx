
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatCurrency } from '@/utils/formatters';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

interface Quote {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string;
  description: string;
  category: string | null;
  specific_item: string | null;
  image_urls: string[];
  quoted_amount: number | null;
  admin_notes: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
}

enum QuoteStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  QUOTED = 'quoted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PAID = 'paid',
}

const CustomQuoteManagement = () => {
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all custom quotes
  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Quote[];
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
      toast.error('Could not load custom quotes');
      return [];
    }
  };

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['adminCustomQuotes'],
    queryFn: fetchQuotes,
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async (updatedQuote: Partial<Quote> & { id: string }) => {
      const { id, ...data } = updatedQuote;
      const { error } = await supabase
        .from('custom_quotes')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      
      // If updating to "quoted" status, send a notification to the user
      if (updatedQuote.status === 'quoted' && selectedQuote?.user_id) {
        await supabase.from('notifications').insert({
          user_id: selectedQuote.user_id,
          title: 'Quote Ready',
          message: `Your custom quote for ${selectedQuote.specific_item || selectedQuote.category || 'your item'} is now available.`,
          type: 'custom_quote',
          related_id: selectedQuote.id,
          is_read: false
        });
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomQuotes'] });
      toast.success('Quote updated successfully');
      setQuoteOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Error updating quote: ${error.message}`);
    },
  });

  const handleSaveQuote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedQuote) return;
    
    updateQuoteMutation.mutate(selectedQuote);
  };

  const filteredQuotes = quotes?.filter(quote => {
    if (filter === 'all') return true;
    return quote.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Reviewed</Badge>;
      case 'quoted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Quoted</Badge>;
      case 'accepted':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Accepted</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Quote Requests</CardTitle>
              <CardDescription>
                Manage and respond to custom quote requests from customers
              </CardDescription>
            </div>
            <Select
              value={filter}
              onValueChange={(value: QuoteStatus | 'all') => setFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quotes</SelectItem>
                <SelectItem value={QuoteStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={QuoteStatus.REVIEWED}>Reviewed</SelectItem>
                <SelectItem value={QuoteStatus.QUOTED}>Quoted</SelectItem>
                <SelectItem value={QuoteStatus.ACCEPTED}>Accepted</SelectItem>
                <SelectItem value={QuoteStatus.PAID}>Paid</SelectItem>
                <SelectItem value={QuoteStatus.REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-md">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : !filteredQuotes?.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quote requests found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {formatDate(quote.created_at)}
                      </TableCell>
                      <TableCell>
                        {quote.name || 'N/A'}
                        {quote.email && <div className="text-xs text-gray-500">{quote.email}</div>}
                      </TableCell>
                      <TableCell>
                        {quote.specific_item || quote.category || 'Custom Item'}
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-right">
                        {quote.quoted_amount
                          ? formatCurrency(quote.quoted_amount, 'GBP')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setQuoteOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedQuote && (
        <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quote Request Details</DialogTitle>
              <DialogDescription>
                Review and update the custom quote request
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveQuote} className="space-y-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedQuote.specific_item || selectedQuote.category || 'Custom Item'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Requested on {formatDate(selectedQuote.created_at)}
                  </p>
                </div>
                
                <Select
                  value={selectedQuote.status}
                  onValueChange={(value: QuoteStatus) => {
                    setSelectedQuote({
                      ...selectedQuote,
                      status: value
                    });
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuoteStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={QuoteStatus.REVIEWED}>Reviewed</SelectItem>
                    <SelectItem value={QuoteStatus.QUOTED}>Quoted</SelectItem>
                    <SelectItem value={QuoteStatus.ACCEPTED}>Accepted</SelectItem>
                    <SelectItem value={QuoteStatus.PAID}>Paid</SelectItem>
                    <SelectItem value={QuoteStatus.REJECTED}>Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs defaultValue="details" className="w-full">
                <TabsList>
                  <TabsTrigger value="details">Customer Details</TabsTrigger>
                  <TabsTrigger value="item">Item Information</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="quote">Quote & Notes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <p>{selectedQuote.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p>{selectedQuote.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone Number</label>
                      <p>{selectedQuote.phone_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">User ID</label>
                      <p className="text-sm break-all">{selectedQuote.user_id || 'No account'}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="item" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <p>{selectedQuote.category || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Specific Item</label>
                    <p>{selectedQuote.specific_item || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="whitespace-pre-wrap">{selectedQuote.description}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="images" className="space-y-4">
                  {selectedQuote.image_urls?.length ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedQuote.image_urls.map((url, i) => (
                        <div key={i} className="overflow-hidden rounded-md border">
                          <AspectRatio ratio={1 / 1}>
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="block w-full h-full relative group"
                            >
                              <img
                                src={url}
                                alt={`Item image ${i + 1}`}
                                className="object-cover w-full h-full"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                <ExternalLink className="text-white opacity-0 group-hover:opacity-100 h-6 w-6" />
                              </div>
                            </a>
                          </AspectRatio>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2 text-sm text-muted-foreground">No images provided</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="quote" className="space-y-4">
                  <div>
                    <label htmlFor="quotedAmount" className="text-sm font-medium block mb-1">
                      Quote Amount (£)
                    </label>
                    <Input
                      id="quotedAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={selectedQuote.quoted_amount || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        setSelectedQuote({
                          ...selectedQuote,
                          quoted_amount: value
                        });
                      }}
                      placeholder="Enter quote amount"
                      className="max-w-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminNotes" className="text-sm font-medium block mb-1">
                      Admin Notes (visible to customer)
                    </label>
                    <Textarea
                      id="adminNotes"
                      value={selectedQuote.admin_notes || ''}
                      onChange={(e) => {
                        setSelectedQuote({
                          ...selectedQuote,
                          admin_notes: e.target.value
                        });
                      }}
                      placeholder="Add notes visible to customer"
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setQuoteOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateQuoteMutation.isPending}
                >
                  {updateQuoteMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CustomQuoteManagement;
