
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Mail, Check, X, Send, Pencil, Image, Phone } from 'lucide-react';

const CustomQuoteManagement = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quotedAmount, setQuotedAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, refreshTrigger]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      // Build the query
      let query = supabase.from('custom_quotes').select(`
        *,
        profiles:user_id (email, full_name)
      `).order('created_at', { ascending: false });
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
    setQuotedAmount(quote.quoted_amount ? quote.quoted_amount.toString() : '');
    setAdminNotes(quote.admin_notes || '');
    setViewDialogOpen(true);
  };

  const handleRespondToQuote = (quote: any) => {
    setSelectedQuote(quote);
    setQuotedAmount(quote.quoted_amount ? quote.quoted_amount.toString() : '');
    setAdminNotes(quote.admin_notes || '');
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuote) return;
    
    try {
      // Update the custom quote with admin response
      const { error } = await supabase
        .from('custom_quotes')
        .update({
          quoted_amount: parseFloat(quotedAmount) || null,
          admin_notes: adminNotes,
          status: 'quoted',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedQuote.id);
      
      if (error) throw error;
      
      // Create a notification for the user
      if (selectedQuote.user_id) {
        await supabase.from('notifications').insert({
          user_id: selectedQuote.user_id,
          title: 'Custom Quote Response',
          message: `Your custom quote request has been processed. The quoted amount is £${quotedAmount}.`,
          type: 'quote_response',
          related_id: selectedQuote.id,
          is_read: false
        });
      }
      
      // Send email notification
      try {
        await supabase.functions.invoke('send-quote-email', {
          body: {
            quoteId: selectedQuote.id,
            amount: quotedAmount,
            notes: adminNotes,
            recipientEmail: selectedQuote.profiles?.email,
            recipientName: selectedQuote.profiles?.full_name || selectedQuote.sender_details?.name || 'Customer'
          }
        });
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't throw, we'll still update the quote status
      }
      
      toast({
        title: 'Quote Processed',
        description: 'Custom quote has been processed successfully',
      });
      
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
      setResponseDialogOpen(false);
    } catch (error: any) {
      console.error('Error processing quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to process custom quote',
        variant: 'destructive',
      });
    }
  };

  const handleRejectQuote = async () => {
    if (!selectedQuote) return;
    
    try {
      // Update the custom quote status to rejected
      const { error } = await supabase
        .from('custom_quotes')
        .update({
          admin_notes: adminNotes || 'This quote request has been rejected.',
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedQuote.id);
      
      if (error) throw error;
      
      // Create a notification for the user
      if (selectedQuote.user_id) {
        await supabase.from('notifications').insert({
          user_id: selectedQuote.user_id,
          title: 'Custom Quote Rejected',
          message: 'Your custom quote request has been reviewed and unfortunately cannot be processed.',
          type: 'quote_rejected',
          related_id: selectedQuote.id,
          is_read: false
        });
      }
      
      toast({
        title: 'Quote Rejected',
        description: 'Custom quote has been rejected',
      });
      
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
      setResponseDialogOpen(false);
    } catch (error: any) {
      console.error('Error rejecting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject custom quote',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'quoted':
        return 'bg-green-500 hover:bg-green-600';
      case 'rejected':
        return 'bg-red-500 hover:bg-red-600';
      case 'paid':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Custom Quote Requests</h2>
          <p className="text-muted-foreground">
            Manage and respond to customer quote requests
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quotes</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setRefreshTrigger(prev => prev + 1)} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : quotes.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {quote.profiles?.full_name || quote.sender_details?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>{quote.category || 'Other'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(quote.status)}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {quote.phone_number}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewQuote(quote)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {quote.status === 'pending' && (
                        <Button variant="default" size="sm" onClick={() => handleRespondToQuote(quote)}>
                          <Send className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-center text-muted-foreground">No custom quote requests found</p>
            {statusFilter !== 'all' && (
              <Button variant="link" onClick={() => setStatusFilter('all')}>
                Show all requests
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* View Quote Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Custom Quote Details</DialogTitle>
            <DialogDescription>
              Request submitted on {selectedQuote && new Date(selectedQuote.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4 py-4">
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Quote Details</TabsTrigger>
                  <TabsTrigger value="customer">Customer Info</TabsTrigger>
                  <TabsTrigger value="images">Images ({selectedQuote.image_urls?.length || 0})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                      <Badge className={getStatusBadgeColor(selectedQuote.status)}>
                        {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                      <p>{selectedQuote.category || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                    <p className="rounded-md border p-3 bg-gray-50">{selectedQuote.description}</p>
                  </div>
                  
                  {selectedQuote.quoted_amount && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Quoted Amount</h4>
                      <p className="text-lg font-semibold">£{selectedQuote.quoted_amount}</p>
                    </div>
                  )}
                  
                  {selectedQuote.admin_notes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Admin Notes</h4>
                      <p className="rounded-md border p-3 bg-gray-50">{selectedQuote.admin_notes}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="customer" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Customer Name</h4>
                      <p>{selectedQuote.profiles?.full_name || selectedQuote.sender_details?.name || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact Number</h4>
                      <p>{selectedQuote.phone_number}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                      <p>{selectedQuote.profiles?.email || selectedQuote.sender_details?.email || 'Not available'}</p>
                    </div>
                  </div>
                  
                  {selectedQuote.sender_details && Object.keys(selectedQuote.sender_details).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Sender Details</h4>
                      <div className="rounded-md border p-3 bg-gray-50">
                        <p><strong>Name:</strong> {selectedQuote.sender_details.name}</p>
                        {selectedQuote.sender_details.email && <p><strong>Email:</strong> {selectedQuote.sender_details.email}</p>}
                        {selectedQuote.sender_details.phone && <p><strong>Phone:</strong> {selectedQuote.sender_details.phone}</p>}
                        {selectedQuote.sender_details.address && <p><strong>Address:</strong> {selectedQuote.sender_details.address}</p>}
                      </div>
                    </div>
                  )}
                  
                  {selectedQuote.recipient_details && Object.keys(selectedQuote.recipient_details).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Recipient Details</h4>
                      <div className="rounded-md border p-3 bg-gray-50">
                        <p><strong>Name:</strong> {selectedQuote.recipient_details.name}</p>
                        {selectedQuote.recipient_details.phone && <p><strong>Phone:</strong> {selectedQuote.recipient_details.phone}</p>}
                        {selectedQuote.recipient_details.additionalPhone && <p><strong>Additional Phone:</strong> {selectedQuote.recipient_details.additionalPhone}</p>}
                        {selectedQuote.recipient_details.address && <p><strong>Address:</strong> {selectedQuote.recipient_details.address}</p>}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="images" className="mt-4">
                  {selectedQuote.image_urls && selectedQuote.image_urls.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedQuote.image_urls.map((url: string, index: number) => (
                        <div key={index} className="rounded-md border overflow-hidden">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={url} 
                              alt={`Quote image ${index + 1}`} 
                              className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No images attached to this quote request</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedQuote && selectedQuote.status === 'pending' && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                handleRespondToQuote(selectedQuote);
              }}>
                <Send className="h-4 w-4 mr-1" />
                Respond to Quote
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Respond to Quote Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Respond to Quote Request</DialogTitle>
            <DialogDescription>
              Provide a quote amount and any notes for the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Customer Request:</h4>
              <p className="text-sm">{selectedQuote?.description}</p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Quoted Amount (£)
              </label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                placeholder="Enter amount in GBP"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes to Customer
              </label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any additional details or conditions"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleRejectQuote}>
              <X className="h-4 w-4 mr-1" />
              Reject Quote
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitResponse} disabled={!quotedAmount}>
                <Check className="h-4 w-4 mr-1" />
                Submit Quote
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomQuoteManagement;
