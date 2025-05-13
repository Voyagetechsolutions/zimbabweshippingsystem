
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, X } from 'lucide-react';

interface CustomQuote {
  id: string;
  user_id: string;
  shipment_id: string | null;
  name: string;
  email: string;
  description: string;
  category: string | null;
  phone_number: string;
  status: string;
  quoted_amount: number | null;
  image_urls: string[];
  admin_notes: string | null;
  created_at: string;
  sender_details: any;
  recipient_details: any;
}

const CustomQuoteManagement = () => {
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [quoteStatus, setQuoteStatus] = useState<string>('');
  const { toast } = useToast();

  // Fetch custom quotes
  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('custom_quotes')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setQuotes(data || []);
        setFilteredQuotes(data || []);
      } catch (error: any) {
        console.error('Error fetching custom quotes:', error);
        toast({
          title: 'Error',
          description: 'Failed to load custom quotes. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotes();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('custom_quotes_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'custom_quotes'
        }, 
        (payload) => {
          console.log('Received real-time update:', payload);
          fetchQuotes();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast]);

  // Apply filters when search or status filter changes
  useEffect(() => {
    let result = quotes;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(quote => quote.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(quote => 
        quote.name?.toLowerCase().includes(search) ||
        quote.email?.toLowerCase().includes(search) ||
        quote.description?.toLowerCase().includes(search) ||
        quote.category?.toLowerCase().includes(search) ||
        quote.phone_number?.toLowerCase().includes(search)
      );
    }
    
    setFilteredQuotes(result);
  }, [quotes, searchTerm, statusFilter]);

  // Handle quote selection
  const handleQuoteSelect = (quote: CustomQuote) => {
    setSelectedQuote(quote);
    setQuoteAmount(quote.quoted_amount ? quote.quoted_amount.toString() : '');
    setAdminNotes(quote.admin_notes || '');
    setQuoteStatus(quote.status);
  };

  // Handle quote update
  const handleUpdateQuote = async () => {
    if (!selectedQuote) return;
    
    try {
      const amount = quoteAmount ? parseFloat(quoteAmount) : null;
      
      const { error } = await supabase
        .from('custom_quotes')
        .update({
          quoted_amount: amount,
          admin_notes: adminNotes,
          status: quoteStatus,
        })
        .eq('id', selectedQuote.id);
        
      if (error) throw error;
      
      // Create a notification for the user
      await supabase.from('notifications').insert({
        user_id: selectedQuote.user_id,
        title: 'Custom Quote Updated',
        message: `Your custom quote request has been ${quoteStatus.toLowerCase()}. ${quoteStatus === 'approved' ? `The quoted amount is £${amount}` : ''}`,
        type: 'custom_quote',
        related_id: selectedQuote.id,
        is_read: false
      });
      
      toast({
        title: 'Quote Updated',
        description: 'The custom quote has been successfully updated',
      });
      
      // Close dialog and refresh quotes
      setSelectedQuote(null);
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update the quote',
        variant: 'destructive',
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render status badge
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Quote Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search quotes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading custom quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No custom quotes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>{formatDate(quote.created_at)}</TableCell>
                      <TableCell>{quote.name || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={quote.description}>
                        {quote.description}
                      </TableCell>
                      <TableCell>{renderStatusBadge(quote.status)}</TableCell>
                      <TableCell>
                        {quote.quoted_amount ? `£${quote.quoted_amount.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleQuoteSelect(quote)}
                        >
                          Manage
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
      
      {/* Quote Details Dialog */}
      {selectedQuote && (
        <Dialog open={Boolean(selectedQuote)} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Manage Custom Quote</DialogTitle>
              <DialogDescription>
                Quote requested by {selectedQuote.name || 'Unknown'} on {formatDate(selectedQuote.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Customer Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <p>{selectedQuote.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p>{selectedQuote.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <p>{selectedQuote.phone_number}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <p>{selectedQuote.category || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Quote Management</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Quote Amount (£):</span>
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Admin Notes:</span>
                    <Textarea 
                      placeholder="Add notes about this quote..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <h3 className="text-sm font-medium mb-2">Item Description</h3>
              <p className="whitespace-pre-wrap p-3 bg-gray-50 rounded-md">{selectedQuote.description}</p>
            </div>
            
            {selectedQuote.image_urls && selectedQuote.image_urls.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Uploaded Images ({selectedQuote.image_urls.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {selectedQuote.image_urls.map((url, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img 
                        src={url} 
                        alt={`Quote image ${index + 1}`} 
                        className="object-cover w-full h-full rounded-md border cursor-pointer"
                        onClick={() => setViewImageIndex(index)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="bg-white"
                          onClick={() => setViewImageIndex(index)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setSelectedQuote(null)}>Cancel</Button>
              <Button onClick={handleUpdateQuote}>Update Quote</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Image Preview Dialog */}
      {selectedQuote && viewImageIndex !== null && selectedQuote.image_urls[viewImageIndex] && (
        <Dialog open={viewImageIndex !== null} onOpenChange={() => setViewImageIndex(null)}>
          <DialogContent className="max-w-4xl p-1 bg-black">
            <div className="relative">
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-2 right-2 z-10 bg-white"
                onClick={() => setViewImageIndex(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img 
                src={selectedQuote.image_urls[viewImageIndex]} 
                alt="Image preview" 
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
            <div className="flex justify-between p-2">
              <Button 
                variant="outline" 
                disabled={viewImageIndex === 0}
                onClick={() => setViewImageIndex(prev => prev !== null ? prev - 1 : null)}
              >
                Previous
              </Button>
              <Button 
                variant="outline"
                disabled={viewImageIndex === selectedQuote.image_urls.length - 1}
                onClick={() => setViewImageIndex(prev => prev !== null ? prev + 1 : null)}
              >
                Next
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomQuoteManagement;
