
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  Clock,
  Eye,
  Filter,
  Loader2,
  MessageCircle,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';

// Define interfaces for type safety
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

// Define a type for support tickets
interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: ProfileData;
  user_email?: string;
  user_name?: string;
  responses?: TicketResponse[];
}

// Define a more flexible type for response data from database
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

// Type for the actual raw response from Supabase
type RawTicketResponseData = {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  notification_sent: boolean;
  profiles: any; // Using any here as the structure may vary
}

const SupportDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({});

  // Fetch support tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      // Fetch tickets with user profiles
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id(
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
        
      if (ticketsError) throw ticketsError;
      
      console.log('Fetched support tickets:', ticketsData);
      
      // Process the tickets data to include user information
      const processedTickets: SupportTicket[] = await Promise.all((ticketsData || []).map(async (ticket) => {
        // Safely extract profile data
        const userEmail = ticket.profiles?.email || 'Unknown';
        const userName = ticket.profiles?.full_name || 'Unknown User';
        
        // Fetch responses for each ticket
        const { data: responsesData, error: responsesError } = await supabase
          .from('ticket_responses')
          .select(`
            *,
            profiles:user_id(
              email,
              full_name
            )
          `)
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true });
          
        if (responsesError) throw responsesError;
        
        // Use type assertion to handle the raw data
        const formattedResponses: TicketResponse[] = (responsesData as RawTicketResponseData[]).map((response) => {
          return {
            id: response.id,
            ticket_id: response.ticket_id,
            user_id: response.user_id,
            message: response.message,
            is_staff_response: response.is_staff_response,
            created_at: response.created_at,
            notification_sent: response.notification_sent,
            // Safely extract user data, defaulting to empty strings
            user_email: response.profiles?.email || '',
            user_name: response.profiles?.full_name || '',
          };
        });
        
        return {
          ...ticket,
          user_email: userEmail,
          user_name: userName,
          responses: formattedResponses,
        };
      }));
      
      return processedTickets;
    },
  });

  // Filter tickets based on status, priority, and search query
  const filteredTickets = tickets?.filter(ticket => {
    // Filter by status
    if (filterStatus !== 'all' && ticket.status !== filterStatus) {
      return false;
    }
    
    // Filter by priority
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.message.toLowerCase().includes(query) ||
        ticket.user_name?.toLowerCase().includes(query) ||
        ticket.user_email?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Counts
  const openTickets = tickets?.filter(t => t.status === 'Open').length || 0;
  const inProgressTickets = tickets?.filter(t => t.status === 'In Progress').length || 0;
  const resolvedTickets = tickets?.filter(t => t.status === 'Resolved').length || 0;
  
  // Handle response submission
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket || !responseMessage.trim()) {
      toast({
        title: 'Invalid Response',
        description: 'Please ensure your response has content',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Add the response
      const { data: responseData, error: responseError } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: responseMessage,
          is_staff_response: true,
          notification_sent: false,
        })
        .select(`
          *,
          profiles:user_id(
            email,
            full_name
          )
        `)
        .single();
      
      if (responseError) throw responseError;
      
      // Type assertion to handle the raw response data
      const rawResponse = responseData as RawTicketResponseData;
      
      // Create a properly formatted response object
      const newResponse: TicketResponse = {
        id: rawResponse.id,
        ticket_id: rawResponse.ticket_id,
        user_id: rawResponse.user_id,
        message: rawResponse.message,
        is_staff_response: rawResponse.is_staff_response,
        created_at: rawResponse.created_at,
        notification_sent: rawResponse.notification_sent,
        // Safely extract profile data with fallbacks
        user_email: rawResponse.profiles?.email || '',
        user_name: rawResponse.profiles?.full_name || '',
      };
      
      // Update the ticket status to "In Progress" if it's currently "Open"
      if (selectedTicket.status === 'Open') {
        await supabase
          .from('support_tickets')
          .update({ 
            status: 'In Progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedTicket.id);
      }
      
      // Create a notification for the user
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedTicket.user_id,
          title: 'Support Ticket Response',
          message: `New response to your ticket "${selectedTicket.subject}"`,
          type: 'support',
          related_id: selectedTicket.id,
        });
      
      // Reset the response form
      setResponseMessage('');
      
      // Update the UI with the new response
      setSelectedTicket(current => {
        if (!current) return null;
        
        return {
          ...current,
          status: current.status === 'Open' ? 'In Progress' : current.status,
          responses: [...(current.responses || []), newResponse],
        };
      });
      
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      
      toast({
        title: 'Response Sent',
        description: 'Your response has been successfully sent',
      });
      
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit response',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ticket status update
  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);
        
      if (error) throw error;
      
      // Update the selected ticket if it's the one being updated
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      
      // Create a notification for the user
      const ticketToUpdate = tickets?.find(t => t.id === ticketId);
      if (ticketToUpdate) {
        await supabase
          .from('notifications')
          .insert({
            user_id: ticketToUpdate.user_id,
            title: 'Support Ticket Updated',
            message: `Your ticket "${ticketToUpdate.subject}" status changed to ${newStatus}`,
            type: 'support',
            related_id: ticketId,
          });
      }
      
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      
      toast({
        title: 'Status Updated',
        description: `Ticket status updated to ${newStatus}`,
      });
      
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  };

  // Toggle expanding a ticket
  const toggleTicketExpand = (ticketId: string) => {
    setExpandedTickets(current => ({
      ...current,
      [ticketId]: !current[ticketId]
    }));
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{status}</Badge>;
      case 'In Progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{status}</Badge>;
      case 'Resolved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">{status}</Badge>;
      case 'Closed':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get priority badge style
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Low':
        return <Badge variant="outline" className="border-green-300 text-green-800">{priority}</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="border-blue-300 text-blue-800">{priority}</Badge>;
      case 'High':
        return <Badge variant="outline" className="border-orange-300 text-orange-800">{priority}</Badge>;
      case 'Urgent':
        return <Badge variant="outline" className="border-red-300 text-red-800">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">{openTickets}</div>
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
              <div className="text-2xl font-bold">{inProgressTickets}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">{resolvedTickets}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tickets View */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Manage customer support tickets</CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets by subject, customer, or content"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[160px]">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="tickets">
            <TabsList className="mb-4">
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              {selectedTicket && (
                <TabsTrigger value="responses">Ticket Details</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="tickets">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ) : filteredTickets && filteredTickets.length > 0 ? (
                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <Card key={ticket.id} className="overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer flex justify-between items-start"
                        onClick={() => toggleTicketExpand(ticket.id)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{ticket.subject}</h3>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            {ticket.user_name || 'Unknown User'}
                            <span>•</span>
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {expandedTickets[ticket.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                      
                      {expandedTickets[ticket.id] && (
                        <div className="px-4 pb-4">
                          <div className="border-t pt-3 mb-3">
                            <h4 className="text-sm font-medium mb-2">Message:</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-line">{ticket.message}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                            {ticket.status !== 'Closed' && (
                              <>
                                {ticket.status !== 'Resolved' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateTicketStatus(ticket.id, 'Resolved')}
                                  >
                                    Mark Resolved
                                  </Button>
                                )}
                                
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateTicketStatus(ticket.id, 'Closed')}
                                >
                                  Close Ticket
                                </Button>
                              </>
                            )}
                            
                            <Button 
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No support tickets found</h3>
                  <p className="text-gray-500 mt-1">
                    {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' 
                      ? "Try adjusting your filters" 
                      : "There are no support tickets to display"}
                  </p>
                </div>
              )}
            </TabsContent>
            
            {selectedTicket && (
              <TabsContent value="responses">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedTicket.subject}
                          {getStatusBadge(selectedTicket.status)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          From: {selectedTicket.user_name} ({selectedTicket.user_email})
                        </CardDescription>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          {getPriorityBadge(selectedTicket.priority)}
                          <span>•</span>
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {selectedTicket.status !== 'Closed' && (
                          <>
                            {selectedTicket.status !== 'Resolved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')}
                              >
                                Mark Resolved
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'Closed')}
                            >
                              Close Ticket
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="border p-4 rounded-lg bg-gray-50">
                      <h4 className="text-sm font-medium mb-2">Initial Message:</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{selectedTicket.message}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Conversation:</h4>
                      
                      {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                        selectedTicket.responses.map((response) => (
                          <div 
                            key={response.id} 
                            className={`p-4 rounded-lg ${
                              response.is_staff_response 
                                ? 'bg-blue-50 border border-blue-100 ml-8' 
                                : 'bg-gray-50 border border-gray-100 mr-8'
                            }`}
                          >
                            <div className="flex justify-between mb-2">
                              <div className="font-medium text-sm">
                                {response.is_staff_response 
                                  ? 'Support Team' 
                                  : response.user_name || 'Customer'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(response.created_at), 'MMM d, yyyy HH:mm')}
                              </div>
                            </div>
                            <p className="text-sm whitespace-pre-line">{response.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No responses yet
                        </div>
                      )}
                    </div>
                    
                    {selectedTicket.status !== 'Closed' && (
                      <form onSubmit={handleSubmitResponse} className="pt-2">
                        <h4 className="font-medium mb-2">Add Response:</h4>
                        <Textarea
                          placeholder="Type your response here..."
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          rows={4}
                          className="mb-2"
                        />
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={isSubmitting || !responseMessage.trim()}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Response
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-end border-t pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedTicket(null)}
                    >
                      Back to Tickets
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportDashboard;
