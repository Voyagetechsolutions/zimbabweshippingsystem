
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Search, PlusCircle, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  user_id: string;
  category: string;
  reference_number: string;
  responses?: TicketResponse[];
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  message: string;
  created_at: string;
  is_admin: boolean;
  user_id: string;
  user_name?: string;
}

const CustomerTickets = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'general'
  });
  
  // Reply to ticket
  const [replyMessage, setReplyMessage] = useState('');
  
  useEffect(() => {
    fetchTickets();
  }, []);
  
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to view your support tickets",
          variant: "destructive",
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTicketResponses = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching ticket responses:', error);
      return [];
    }
  };
  
  const handleTicketSelect = async (ticket: Ticket) => {
    try {
      const responses = await fetchTicketResponses(ticket.id);
      setSelectedTicket({
        ...ticket,
        responses: responses || []
      });
      
      // Mark related notifications as read
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('related_id', ticket.id)
          .eq('type', 'ticket_response');
      }
    } catch (error) {
      console.error('Error selecting ticket:', error);
    }
  };
  
  const handleNewTicketChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTicket(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCategoryChange = (value: string) => {
    setNewTicket(prev => ({ ...prev, category: value }));
  };
  
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and description for your ticket.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a support ticket",
          variant: "destructive",
        });
        return;
      }
      
      // Generate reference number
      const referenceNumber = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Create ticket
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          title: newTicket.title,
          description: newTicket.description,
          category: newTicket.category,
          status: 'open',
          user_id: user.id,
          reference_number: referenceNumber
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Admin placeholder ID
        title: 'New Support Ticket',
        message: `New ticket: ${newTicket.title}`,
        type: 'ticket',
        related_id: data.id,
        is_read: false
      });
      
      toast({
        title: "Ticket created",
        description: `Your support ticket has been submitted with reference number: ${referenceNumber}`,
      });
      
      // Reset form
      setNewTicket({
        title: '',
        description: '',
        category: 'general'
      });
      
      // Refresh tickets
      fetchTickets();
      
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create support ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyMessage.trim() || !selectedTicket) {
      return;
    }
    
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to reply to a ticket",
          variant: "destructive",
        });
        return;
      }
      
      // Create response
      const { data, error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          message: replyMessage,
          user_id: user.id,
          is_admin: false,
          user_name: user.user_metadata?.full_name || user.email
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update ticket status if it was closed
      if (selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') {
        await supabase
          .from('support_tickets')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTicket.id);
      } else {
        // Just update the timestamp
        await supabase
          .from('support_tickets')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTicket.id);
      }
      
      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Admin placeholder ID
        title: 'New Ticket Reply',
        message: `New reply on ticket: ${selectedTicket.reference_number}`,
        type: 'ticket_response',
        related_id: selectedTicket.id,
        is_read: false
      });
      
      toast({
        title: "Reply sent",
        description: "Your response has been submitted.",
      });
      
      // Add the new response to the selected ticket
      setSelectedTicket(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          responses: [
            ...(prev.responses || []),
            data
          ],
          status: prev.status === 'closed' || prev.status === 'resolved' ? 'in_progress' : prev.status
        };
      });
      
      // Reset form
      setReplyMessage('');
      
      // Refresh tickets list to get updated status
      fetchTickets();
      
    } catch (error: any) {
      console.error('Error replying to ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const getFilteredTickets = () => {
    return tickets.filter(ticket => {
      // Apply status filter
      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }
      
      // Apply search filter
      if (searchTerm) {
        const lowercaseSearch = searchTerm.toLowerCase();
        return (
          ticket.title.toLowerCase().includes(lowercaseSearch) ||
          ticket.reference_number.toLowerCase().includes(lowercaseSearch) ||
          ticket.description.toLowerCase().includes(lowercaseSearch)
        );
      }
      
      return true;
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'general':
        return 'General Inquiry';
      case 'shipment':
        return 'Shipment Issue';
      case 'payment':
        return 'Payment Problem';
      case 'tracking':
        return 'Tracking Question';
      case 'complaint':
        return 'Complaint';
      default:
        return category;
    }
  };
  
  const filteredTickets = getFilteredTickets();
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="tickets">
        <TabsList className="mb-6">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="new-ticket" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Ticket
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tickets" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardHeader className="pb-2 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-12 bg-gray-200 rounded w-full"></div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardFooter>
                </Card>
              ))
            ) : filteredTickets.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No tickets found</h3>
                <p className="mt-1 text-gray-500">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No tickets match your search criteria'
                    : 'You have not created any support tickets yet'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button 
                    onClick={() => document.querySelector('[value="new-ticket"]')?.dispatchEvent(
                      new MouseEvent('click', { bubbles: true })
                    )}
                    className="mt-4 bg-zim-green hover:bg-zim-green/90"
                  >
                    Create New Ticket
                  </Button>
                )}
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <Card 
                  key={ticket.id} 
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    selectedTicket?.id === ticket.id ? 'ring-2 ring-zim-green' : ''
                  }`}
                  onClick={() => handleTicketSelect(ticket)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base line-clamp-1">{ticket.title}</CardTitle>
                        <p className="text-xs text-gray-500">
                          {ticket.reference_number} · {new Date(ticket.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <p className="text-xs text-gray-500">
                      Category: {getCategoryLabel(ticket.category)}
                    </p>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
          
          {selectedTicket && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedTicket.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Reference: {selectedTicket.reference_number} · 
                      Category: {getCategoryLabel(selectedTicket.category)} · 
                      Created: {new Date(selectedTicket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium mb-1 text-sm">Initial Query:</p>
                  <p className="text-gray-700">{selectedTicket.description}</p>
                </div>
                
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTicket.responses.map((response) => (
                      <div 
                        key={response.id} 
                        className={`p-4 rounded-lg ${
                          response.is_admin 
                            ? 'bg-blue-50 border-l-4 border-blue-500 ml-4' 
                            : 'bg-gray-50 border-l-4 border-gray-300 mr-4'
                        }`}
                      >
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">
                            {response.is_admin ? 'Support Team' : 'You'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(response.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{response.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No responses yet. Please wait for our support team to respond.</p>
                  </div>
                )}
                
                {selectedTicket.status !== 'closed' && (
                  <form onSubmit={handleReplySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="reply" className="text-sm font-medium">
                        Add a reply
                      </Label>
                      <Textarea
                        id="reply"
                        placeholder="Type your message here..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="mt-1"
                        rows={4}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="bg-zim-green hover:bg-zim-green/90"
                      disabled={submitting}
                    >
                      {submitting ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </form>
                )}
                
                {selectedTicket.status === 'closed' && (
                  <div className="bg-gray-100 p-4 rounded-md text-center">
                    <p className="text-gray-700">This ticket is closed. To reopen it, please add a reply.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="new-ticket">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" /> Create a New Support Ticket
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateTicket}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="shipment">Shipment Issue</SelectItem>
                      <SelectItem value="payment">Payment Problem</SelectItem>
                      <SelectItem value="tracking">Tracking Question</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Subject</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Brief summary of your issue"
                    value={newTicket.title}
                    onChange={handleNewTicketChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Please provide details of your issue or question..."
                    value={newTicket.description}
                    onChange={handleNewTicketChange}
                    rows={6}
                    required
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                  <p className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Our support team typically responds within 24 hours during business days.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  type="submit" 
                  className="bg-zim-green hover:bg-zim-green/90"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerTickets;
