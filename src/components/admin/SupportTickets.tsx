
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from "@/components/ui/tabs";
import {
  LifeBuoy,
  Search,
  RefreshCcw,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Filter,
  Send
} from "lucide-react";
import { format } from 'date-fns';

interface Ticket {
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
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const SupportTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketResponses, setTicketResponses] = useState<TicketResponse[]>([]);
  const [newResponse, setNewResponse] = useState('');
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch all tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      
      if (ticketsData) {
        // Get user information for each ticket
        const ticketsWithUsers = await Promise.all(
          ticketsData.map(async (ticket) => {
            // Fetch user profile information
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', ticket.user_id)
              .single();
            
            return {
              ...ticket,
              user_email: profileData?.email || 'Unknown',
              user_name: profileData?.full_name || 'Unknown User'
            };
          })
        );
        
        setTickets(ticketsWithUsers as Ticket[]);
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketResponses = async (ticketId: string) => {
    setLoadingResponses(true);
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        // Get user information for each response
        const responsesWithUsers = await Promise.all(
          data.map(async (response) => {
            // Fetch user profile information
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', response.user_id)
              .single();
            
            return {
              ...response,
              user_email: profileData?.email || 'Unknown',
              user_name: profileData?.full_name || 'Unknown User'
            };
          })
        );
        
        setTicketResponses(responsesWithUsers as TicketResponse[]);
      }
    } catch (error: any) {
      console.error('Error fetching ticket responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ticket messages',
        variant: 'destructive',
      });
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleTicketSelect = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketResponses(ticket.id);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      // Update local state
      setSelectedTicket({
        ...selectedTicket,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      setTickets(tickets.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, status: newStatus, updated_at: new Date().toISOString() } 
          : ticket
      ));
      
      toast({
        title: 'Status Updated',
        description: `Ticket status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicket) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      // Update local state
      setSelectedTicket({
        ...selectedTicket,
        priority: newPriority,
        updated_at: new Date().toISOString()
      });
      
      setTickets(tickets.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, priority: newPriority, updated_at: new Date().toISOString() } 
          : ticket
      ));
      
      toast({
        title: 'Priority Updated',
        description: `Ticket priority changed to ${newPriority}`,
      });
    } catch (error: any) {
      console.error('Error updating ticket priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket priority',
        variant: 'destructive',
      });
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !user) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      // Update local state
      setSelectedTicket({
        ...selectedTicket,
        assigned_to: user.id,
        updated_at: new Date().toISOString()
      });
      
      setTickets(tickets.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, assigned_to: user.id, updated_at: new Date().toISOString() } 
          : ticket
      ));
      
      toast({
        title: 'Ticket Assigned',
        description: `Ticket assigned to you`,
      });
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign ticket',
        variant: 'destructive',
      });
    }
  };

  const submitResponse = async () => {
    if (!selectedTicket || !user || !newResponse.trim()) return;
    
    setIsSubmittingResponse(true);
    try {
      // Add response
      const { data, error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newResponse.trim(),
          is_staff_response: true
        })
        .select('*')
        .single();

      if (error) throw error;
      
      if (data) {
        // Update ticket's last update timestamp
        await supabase
          .from('support_tickets')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTicket.id);
          
        // Add user info to the response for display
        const responseWithUser = {
          ...data,
          user_email: user.email || 'Unknown',
          user_name: user.user_metadata?.full_name || 'Staff'
        };
        
        // Update local state
        setTicketResponses([...ticketResponses, responseWithUser as TicketResponse]);
        setNewResponse('');
        
        toast({
          title: 'Response Sent',
          description: 'Your response has been added to the ticket',
        });

        // Update tickets list to show the latest update time
        setTickets(tickets.map(ticket => 
          ticket.id === selectedTicket.id 
            ? { ...ticket, updated_at: new Date().toISOString() } 
            : ticket
        ));
      }
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Status badge styles
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  // Priority badge styles
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      searchQuery === '' ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || ticket.priority.toLowerCase() === priorityFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Support Tickets</CardTitle>
          <CardDescription>View and manage customer support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search tickets..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Priority" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={fetchTickets}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-12">
              <LifeBuoy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No tickets found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? "Try adjusting your filters" 
                  : "There are no support tickets in the system"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleTicketSelect(ticket)}
                    >
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>{ticket.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeClass(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket: {selectedTicket?.subject}</DialogTitle>
            <DialogDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{selectedTicket?.user_name} ({selectedTicket?.user_email})</span>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusBadgeClass(selectedTicket?.status || '')}>
                  {selectedTicket?.status}
                </Badge>
                <Badge className={getPriorityBadgeClass(selectedTicket?.priority || '')}>
                  {selectedTicket?.priority}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-hidden flex flex-col flex-grow">
            {/* Ticket actions */}
            <div className="flex flex-wrap gap-2">
              <Select 
                value={selectedTicket?.status} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedTicket?.priority} 
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="default"
                onClick={handleAssignToMe}
                disabled={selectedTicket?.assigned_to === user?.id}
              >
                {selectedTicket?.assigned_to === user?.id ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Assigned to me
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Assign to me
                  </>
                )}
              </Button>
            </div>
            
            {/* Original ticket message */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{selectedTicket?.user_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedTicket && format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{selectedTicket?.message}</p>
              </CardContent>
            </Card>
            
            {/* Ticket responses */}
            <div className="flex-grow overflow-y-auto space-y-4 max-h-[300px] px-1">
              {loadingResponses ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : ticketResponses.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No responses yet</p>
                </div>
              ) : (
                ticketResponses.map((response) => (
                  <Card 
                    key={response.id} 
                    className={response.is_staff_response ? "border-l-4 border-l-zim-green" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {response.user_name}
                            {response.is_staff_response && " (Staff)"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(response.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap">{response.message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Response input */}
            <div className="mt-4 flex items-end gap-2">
              <div className="flex-grow">
                <Textarea
                  placeholder="Type your response..."
                  rows={3}
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={submitResponse}
                disabled={!newResponse.trim() || isSubmittingResponse}
                className="bg-zim-green hover:bg-zim-green/90 h-10"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedTicket(null)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;
