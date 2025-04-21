
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Clock, 
  Check, 
  AlertCircle, 
  Filter, 
  RefreshCcw,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

interface ProfileData {
  email?: string;
  full_name?: string;
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  notification_sent?: boolean;
  user_email?: string;
  user_name?: string;
}

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  responses?: TicketResponse[];
}

// Interface for response data from database
interface TicketResponseData {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  notification_sent?: boolean;
  profiles?: ProfileData | null;
}

const SupportDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseLimit] = useState(1000);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, statusFilter, searchQuery]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*, profiles:user_id(email, full_name)')
        .order('created_at', { ascending: false });
      
      if (ticketsError) throw ticketsError;
      
      // Format the tickets with user information
      const formattedTickets: SupportTicket[] = ticketsData.map((ticket: any) => ({
        ...ticket,
        user_email: ticket.profiles?.email,
        user_name: ticket.profiles?.full_name,
      }));
      
      // Fetch responses for each ticket
      const ticketsWithResponses = await Promise.all(
        formattedTickets.map(async (ticket: SupportTicket) => {
          const { data: responsesData, error: responsesError } = await supabase
            .from('ticket_responses')
            .select('*, profiles:user_id(email, full_name)')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });
          
          if (responsesError) throw responsesError;
          
          const formattedResponses: TicketResponse[] = responsesData.map((response: TicketResponseData) => {
            // Safely access the email and full_name from profiles data
            const userEmail = response.profiles?.email || '';
            const userName = response.profiles?.full_name || '';
            
            return {
              ...response,
              user_email: userEmail,
              user_name: userName,
            };
          });
          
          return {
            ...ticket,
            responses: formattedResponses,
          };
        })
      );
      
      setTickets(ticketsWithResponses);
      
    } catch (error: any) {
      console.error('Error fetching support tickets:', error.message);
      toast({
        title: 'Error loading tickets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => 
        ticket.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(query) ||
        ticket.message.toLowerCase().includes(query) ||
        (ticket.user_email && ticket.user_email.toLowerCase().includes(query)) ||
        (ticket.user_name && ticket.user_name.toLowerCase().includes(query))
      );
    }
    
    setFilteredTickets(filtered);
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResponseText('');
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
      
      if (error) throw error;
      
      // Update the ticket status in the state
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        )
      );
      
      // If this is the selected ticket, update it too
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      
      toast({
        title: 'Status Updated',
        description: `Ticket status changed to ${newStatus}`,
      });
      
    } catch (error: any) {
      console.error('Error updating ticket status:', error.message);
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;
    
    try {
      setSubmitting(true);
      
      // Add the response
      const { data: responseData, error: responseError } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: responseText.trim(),
          is_staff_response: true,
          notification_sent: false
        })
        .select('*, profiles:user_id(email, full_name)')
        .single();
      
      if (responseError) throw responseError;
      
      // Format the new response, safely accessing profile data
      const newResponse: TicketResponse = {
        ...responseData,
        user_email: responseData.profiles?.email || '',
        user_name: responseData.profiles?.full_name || '',
      };
      
      // Update the ticket status to "In Progress" if it's currently "Open"
      if (selectedTicket.status === 'Open') {
        await handleStatusChange(selectedTicket.id, 'In Progress');
      }
      
      // Update the local state
      const updatedTickets = tickets.map(ticket => {
        if (ticket.id === selectedTicket.id) {
          return {
            ...ticket,
            responses: [...(ticket.responses || []), newResponse]
          };
        }
        return ticket;
      });
      
      setTickets(updatedTickets);
      
      // Update selected ticket
      setSelectedTicket({
        ...selectedTicket,
        responses: [...(selectedTicket.responses || []), newResponse]
      });
      
      // Clear the response text
      setResponseText('');
      
      toast({
        title: 'Response Sent',
        description: 'Your response has been added to the ticket',
      });
      
      // Call the edge function to notify the user (if implemented)
      try {
        await supabase.functions.invoke('send-support-notification', {
          body: { 
            ticketId: selectedTicket.id,
            userId: selectedTicket.user_id,
            messagePreview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
          }
        });
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError);
      }
      
    } catch (error: any) {
      console.error('Error submitting response:', error.message);
      toast({
        title: 'Error sending response',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
      case 'in progress':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{status}</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">{priority}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{priority}</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.status.toLowerCase() === 'open').length}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.status.toLowerCase() === 'in progress').length}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Closed Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.status.toLowerCase() === 'closed').length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedTicket && !isMobile ? "col-span-1" : "col-span-3"}>
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Manage customer support requests</CardDescription>
              
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-3">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="flex space-x-2">
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[130px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in progress">In Progress</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchTickets}
                    className="h-10 w-10"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="hidden md:table-cell">Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Priority</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow 
                          key={ticket.id}
                          className={selectedTicket?.id === ticket.id ? "bg-gray-100" : ""}
                        >
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {ticket.user_name || ticket.user_email || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(ticket.status)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {getPriorityBadge(ticket.priority)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-gray-500 text-sm">
                            {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSelectTicket(ticket)}
                              size="sm"
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No tickets found</h3>
                  <p className="text-gray-500 mt-2">
                    {searchQuery || statusFilter !== 'all' 
                      ? "Try adjusting your filters" 
                      : "There are no support tickets yet"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {selectedTicket && isMobile && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <CardDescription>
                      From: {selectedTicket.user_name || selectedTicket.user_email || 'Unknown'}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTicket(null)}
                  >
                    Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2 flex-wrap gap-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    {format(new Date(selectedTicket.created_at), 'MMM d, yyyy')}
                  </Badge>
                </div>
                
                <div className="border rounded-md p-4 bg-gray-50">
                  <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                
                {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-medium text-gray-500">Conversation</h3>
                    {selectedTicket.responses.map((response) => (
                      <div 
                        key={response.id} 
                        className={`border rounded-md p-4 ${
                          response.is_staff_response ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {response.is_staff_response 
                              ? 'Support Agent' 
                              : (response.user_name || response.user_email || 'Customer')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(response.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{response.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedTicket.status.toLowerCase() !== 'closed' && (
                  <div className="pt-4">
                    <Textarea
                      placeholder="Type your response here..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {responseText.length}/{responseLimit} characters
                      </span>
                      <div className="space-x-2">
                        <Select
                          value={selectedTicket.status}
                          onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleSubmitResponse}
                          disabled={!responseText.trim() || submitting}
                        >
                          {submitting ? 'Sending...' : 'Send Response'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        {selectedTicket && !isMobile && (
          <div className="col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <CardDescription>
                      From: {selectedTicket.user_name || selectedTicket.user_email || 'Unknown'}
                    </CardDescription>
                  </div>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2 mt-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    {format(new Date(selectedTicket.created_at), 'MMM d, yyyy')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="border rounded-md p-4 bg-gray-50 mb-4">
                  <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Conversation</h3>
                    {selectedTicket.responses.map((response) => (
                      <div 
                        key={response.id} 
                        className={`border rounded-md p-4 ${
                          response.is_staff_response ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {response.is_staff_response 
                              ? 'Support Agent' 
                              : (response.user_name || response.user_email || 'Customer')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(response.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{response.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No responses yet
                  </div>
                )}
                
                {selectedTicket.status.toLowerCase() !== 'closed' && (
                  <div className="mt-auto">
                    <Textarea
                      placeholder="Type your response here..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {responseText.length}/{responseLimit} characters
                      </span>
                      <Button 
                        onClick={handleSubmitResponse}
                        disabled={!responseText.trim() || submitting}
                      >
                        {submitting ? 'Sending...' : 'Send Response'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportDashboard;
