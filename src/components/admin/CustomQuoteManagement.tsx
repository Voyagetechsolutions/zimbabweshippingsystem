
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Phone,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  FileEdit,
  Send,
  Clock,
  AlertCircle
} from 'lucide-react';

interface CustomQuote {
  id: string;
  user_id: string | null;
  status: string;
  phone_number: string;
  description: string;
  image_urls: string[];
  created_at: string;
  quoted_amount: number | null;
  admin_notes: string | null;
}

const CustomQuoteManagement = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state for responding to a quote
  const [quoteAmount, setQuoteAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
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
  
  const handleViewQuote = (quote: CustomQuote) => {
    setSelectedQuote(quote);
    setQuoteAmount(quote.quoted_amount?.toString() || '');
    setAdminNotes(quote.admin_notes || '');
    setIsDetailsOpen(true);
    
    // Mark associated notification as read
    updateNotificationStatus(quote.id);
  };
  
  const updateNotificationStatus = async (quoteId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('related_id', quoteId)
        .eq('type', 'custom_quote');
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  };
  
  const handleUpdateQuote = async () => {
    if (!selectedQuote) return;
    
    setIsUpdating(true);
    
    try {
      const amount = parseFloat(quoteAmount);
      
      if (isNaN(amount) && quoteAmount.trim() !== '') {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid number for the quote amount',
          variant: 'destructive',
        });
        setIsUpdating(false);
        return;
      }
      
      const { error } = await supabase
        .from('custom_quotes')
        .update({
          quoted_amount: quoteAmount.trim() === '' ? null : amount,
          admin_notes: adminNotes,
          status: quoteAmount.trim() === '' ? 'pending' : 'quoted'
        })
        .eq('id', selectedQuote.id);
      
      if (error) throw error;
      
      // Add a notification for the user
      if (selectedQuote.user_id && quoteAmount.trim() !== '') {
        await supabase.from('notifications').insert({
          user_id: selectedQuote.user_id,
          title: 'Custom Quote Ready',
          message: `Your custom quote request has been priced at £${amount}. Please check your account for details.`,
          type: 'quote_response',
          related_id: selectedQuote.id,
          is_read: false
        });
      }
      
      toast({
        title: 'Quote Updated',
        description: 'The custom quote has been updated successfully',
      });
      
      // Refresh the quotes list
      fetchQuotes();
      
      // Update the selected quote
      setSelectedQuote({
        ...selectedQuote,
        quoted_amount: quoteAmount.trim() === '' ? null : amount,
        admin_notes: adminNotes,
        status: quoteAmount.trim() === '' ? 'pending' : 'quoted'
      });
      
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update the quote',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const updateQuoteStatus = async (quoteId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('custom_quotes')
        .update({ status })
        .eq('id', quoteId);
      
      if (error) throw error;
      
      toast({
        title: 'Status Updated',
        description: `Quote status changed to ${status}`,
      });
      
      // Refresh the quotes list
      fetchQuotes();
      
      // Update the selected quote if it's open
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote({
          ...selectedQuote,
          status
        });
      }
      
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update the status',
        variant: 'destructive',
      });
    }
  };
  
  // Filter quotes based on status and search query
  const filteredQuotes = quotes.filter(quote => {
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      quote.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Pending</Badge>;
      case 'quoted':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Quoted</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border border-red-300">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border border-gray-300">{status}</Badge>;
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Custom Quote Requests</CardTitle>
          <CardDescription>
            Manage and respond to customer requests for custom shipping quotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by phone number or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <MessageSquare className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={fetchQuotes}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No quotes found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' 
                  ? "Try adjusting your filters" 
                  : "There are no custom quote requests yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        {format(new Date(quote.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-500" />
                          {quote.phone_number}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {quote.description}
                      </TableCell>
                      <TableCell>
                        {quote.image_urls.length > 0 ? (
                          <Badge variant="outline">
                            <ImageIcon className="h-3 w-3 mr-1" /> 
                            {quote.image_urls.length}
                          </Badge>
                        ) : (
                          <span className="text-gray-500 text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(quote.status)}
                      </TableCell>
                      <TableCell>
                        {quote.quoted_amount 
                          ? `£${quote.quoted_amount.toFixed(2)}` 
                          : quote.status === 'pending' 
                            ? <span className="text-yellow-600 text-sm flex items-center"><Clock className="h-3 w-3 mr-1" /> Pending</span>
                            : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewQuote(quote)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {quote.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewQuote(quote)}
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Quote Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Custom Quote Request</SheetTitle>
            <SheetDescription>
              View and respond to this quote request
            </SheetDescription>
          </SheetHeader>
          
          {selectedQuote && (
            <div className="py-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Requested On</h3>
                <p>{format(new Date(selectedQuote.created_at), 'dd MMMM yyyy, HH:mm')}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedQuote.status)}
                  
                  {selectedQuote.status === 'pending' && (
                    <div className="ml-2 text-sm text-yellow-600 flex items-center">
                      <Clock className="h-4 w-4 mr-1" /> Waiting for quote
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Contact Number</h3>
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  {selectedQuote.phone_number}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Item Description</h3>
                <div className="bg-gray-50 p-3 rounded border text-sm">
                  {selectedQuote.description}
                </div>
              </div>
              
              {selectedQuote.image_urls.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Images</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedQuote.image_urls.map((url, index) => (
                      <div key={index} className="relative">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={url} 
                            alt={`Item image ${index + 1}`} 
                            className="w-full h-32 object-cover rounded border"
                          />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Provide Quote Response</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quoteAmount">Quote Amount (£)</Label>
                    <Input
                      id="quoteAmount"
                      type="number"
                      step="0.01"
                      placeholder="Enter amount"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="adminNotes">Notes (Internal)</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Add internal notes about this quote"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleUpdateQuote}
                      disabled={isUpdating}
                      className="bg-zim-green hover:bg-zim-green/90 flex-1"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {selectedQuote.quoted_amount ? 'Update Quote' : 'Send Quote'}
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t flex justify-between">
                    {selectedQuote.status === 'quoted' && (
                      <>
                        <Button
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={() => updateQuoteStatus(selectedQuote.id, 'accepted')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Accepted
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={() => updateQuoteStatus(selectedQuote.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Mark as Rejected
                        </Button>
                      </>
                    )}
                    
                    {(selectedQuote.status === 'accepted' || selectedQuote.status === 'rejected') && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => updateQuoteStatus(selectedQuote.id, 'quoted')}
                      >
                        Reset to Quoted Status
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CustomQuoteManagement;
