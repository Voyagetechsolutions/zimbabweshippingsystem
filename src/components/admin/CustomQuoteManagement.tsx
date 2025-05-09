
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
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
  AlertCircle,
  Mail
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  user_email?: string;
  user_name?: string;
}

const CustomQuoteManagement = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  
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
      // Fetch custom quotes with user profiles
      const { data, error } = await supabase
        .from('custom_quotes')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include user details
      const transformedData = data.map((quote) => ({
        ...quote,
        user_email: quote.profiles?.email || undefined,
        user_name: quote.profiles?.full_name || undefined
      }));
      
      setQuotes(transformedData);
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
      
      // If the user provided an email, show email confirmation dialog
      if (selectedQuote.user_email && quoteAmount.trim() !== '') {
        setShowEmailConfirmation(true);
      } else {
        // Refresh the quotes list if no email to send
        fetchQuotes();
      }
      
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
  
  const sendQuoteEmail = async () => {
    if (!selectedQuote || !selectedQuote.user_email || !quoteAmount) return;
    
    setIsSendingEmail(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: selectedQuote.user_email,
          phone_number: selectedQuote.phone_number,
          quoted_amount: parseFloat(quoteAmount),
          item_description: selectedQuote.description,
          admin_notes: adminNotes
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }
      
      toast({
        title: 'Email Sent',
        description: 'Quote details have been emailed to the customer',
      });
      
      // Close confirmation dialog and refresh quotes
      setShowEmailConfirmation(false);
      fetchQuotes();
      
    } catch (error: any) {
      console.error('Error sending quote email:', error);
      toast({
        title: 'Email Failed',
        description: error.message || 'Failed to send the quote email',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  const skipSendingEmail = () => {
    setShowEmailConfirmation(false);
    fetchQuotes(); // Refresh the quotes list
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
      quote.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quote.user_email && quote.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (quote.user_name && quote.user_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
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
                placeholder="Search by phone number, description or email"
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
                    <TableHead>Contact</TableHead>
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
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1 text-gray-500" />
                            {quote.phone_number}
                          </div>
                          {quote.user_email && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {quote.user_email}
                            </div>
                          )}
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
                <h3 className="text-sm font-medium text-gray-500 mb-1">Contact Information</h3>
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  {selectedQuote.phone_number}
                </p>
                {selectedQuote.user_email && (
                  <p className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    {selectedQuote.user_email}
                  </p>
                )}
                {selectedQuote.user_name && (
                  <p className="text-sm text-gray-500 mt-1">
                    Name: {selectedQuote.user_name}
                  </p>
                )}
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
      
      {/* Email Confirmation Dialog */}
      <AlertDialog open={showEmailConfirmation} onOpenChange={setShowEmailConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Quote by Email?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to send the quote details to the customer by email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={skipSendingEmail}>Skip</AlertDialogCancel>
            <AlertDialogAction
              onClick={sendQuoteEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomQuoteManagement;
