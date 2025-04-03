import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Ticket, TicketResponse, castTo } from '@/types/admin';
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LifeBuoy,
  Search,
  MessageCircle,
  RefreshCcw,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  Inbox,
  Send,
} from "lucide-react";
import { format, formatDistance } from 'date-fns';

const SupportTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [responses, setResponses] = useState<Record<string, TicketResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [newResponse, setNewResponse] = useState<string>('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (viewingTicket) {
      fetchTicketResponses(viewingTicket.id);
    }
  }, [viewingTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('support_tickets' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      
      if (data) {
        // Get user information for each ticket
        const ticketsWithUsers = await Promise.all(
          data.map(async (ticket: any) => {
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
        
        setTickets(castTo<Ticket[]>(ticketsWithUsers));
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
    try {
      const { data, error } = await (supabase
        .from('ticket_responses' as any)
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }) as any);

      if (error) throw error;
      
      if (data) {
        // Get user information for each response
        const responsesWithUsers = await Promise.all(
          data.map(async (response: any) => {
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
        
        setResponses(prev => ({
          ...prev,
          [ticketId]: castTo<TicketResponse[]>(responsesWithUsers)
        }));
      }
    } catch (error: any) {
      console.error('Error fetching ticket responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load responses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!viewingTicket || !newResponse.trim()) return;
    
    setSendingResponse(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await (supabase
        .from('ticket_responses' as any)
        .insert({
          ticket_id: viewingTicket.id,
          user_id: user.id,
          message: newResponse,
          is_staff_response: true
        }) as any);
      
      if (error) throw error;
      
      // Refresh responses
      await fetchTicketResponses(viewingTicket.id);
      
      // Clear response field
      setNewResponse('');
      
      toast({
        title: 'Response Sent',
        description: 'Your response has been sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response',
        variant: 'destructive',
      });
    } finally {
      setSendingResponse(false);
    }
  };

  const updateTicketStatus = async (status: string) => {
    if (!viewingTicket) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await (supabase
        .from('support_tickets' as any)
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewingTicket.id) as any);
      
      if (error) throw error;
      
      // Update local state
      setViewingTicket({
        ...viewingTicket,
        status
      });
      
      // Update in the tickets list
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === viewingTicket.id ? { ...ticket, status } : ticket
        )
      );
      
      toast({
        title: 'Status Updated',
        description: `Ticket status changed to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'waiting':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  // Get priority badge color
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
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
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Support Tickets</CardTitle>
              <CardDescription>Manage customer support requests</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchTickets}
              className="h-10 px-4"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
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
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-12">
              <LifeBuoy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No support tickets found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all'
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
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
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
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDistance(new Date(ticket.updated_at), new Date(), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingTicket(ticket)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
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

      {/* Ticket Details Dialog */}
      {viewingTicket && (
        <Dialog open={!!viewingTicket} onOpenChange={(open) => !open && setViewingTicket(null)}>
          <DialogContent className="sm:max-w-[750px]">
            <DialogHeader>
              <DialogTitle>{viewingTicket.subject}</DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{viewingTicket.user_name}</span>
                  <Badge className={getStatusBadgeClass(viewingTicket.status)}>
                    {viewingTicket.status}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <h3 className="text-lg font-medium">Ticket Details</h3>
                <div className="text-sm text-gray-500">
                  <p>
                    <strong>Submitted:</strong> {format(new Date(viewingTicket.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                  <p>
                    <strong>Priority:</strong> {viewingTicket.priority}
                  </p>
                </div>
                <div className="mt-2 p-4 rounded-md bg-gray-50 border">
                  {viewingTicket.message}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium">Responses</h3>
                {responses[viewingTicket.id] && responses[viewingTicket.id].length > 0 ? (
                  <div className="space-y-4">
                    {responses[viewingTicket.id].map((response) => (
                      <div key={response.id} className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{response.user_name}</span>
                            {response.is_staff_response && (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                Staff
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDistance(new Date(response.created_at), new Date(), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                        <p className="text-sm">{response.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No responses yet.</div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium">Add Response</h3>
                <div className="grid gap-2">
                  <Textarea
                    placeholder="Type your response here..."
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                  />
                  <Button 
                    className="bg-zim-green hover:bg-zim-green/90"
                    onClick={sendResponse}
                    disabled={sendingResponse}
                  >
                    {sendingResponse ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Response
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <div className="flex justify-between w-full">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateTicketStatus('open')}
                    disabled={updatingStatus || viewingTicket.status === 'open'}
                  >
                    {updatingStatus && viewingTicket.status === 'open' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Inbox className="h-4 w-4 mr-2" />
                        Open
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateTicketStatus('resolved')}
                    disabled={updatingStatus || viewingTicket.status === 'resolved'}
                  >
                    {updatingStatus && viewingTicket.status === 'resolved' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Resolve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateTicketStatus('closed')}
                    disabled={updatingStatus || viewingTicket.status === 'closed'}
                  >
                    {updatingStatus && viewingTicket.status === 'closed' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Close
                      </>
                    )}
                  </Button>
                </div>
                <Button type="button" onClick={() => setViewingTicket(null)}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SupportTickets;
