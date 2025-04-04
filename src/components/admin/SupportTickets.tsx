
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Ticket, TicketResponse } from '@/types/admin';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  MessageCircle,
  LifeBuoy,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { format } from 'date-fns';

const SupportTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [ticketResponses, setTicketResponses] = useState<TicketResponse[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Mock ticket data for demo purposes
  const mockTickets: Ticket[] = [
    {
      id: '1',
      user_id: 'u1',
      user_email: 'customer@example.com',
      user_name: 'John Smith',
      subject: 'Shipment delay inquiry',
      message: 'My shipment was supposed to arrive yesterday but I haven\'t received it yet. The tracking number is ZIM-12345.',
      status: 'open',
      priority: 'medium',
      assigned_to: null,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: '2',
      user_id: 'u2',
      user_email: 'business@example.com',
      user_name: 'Sarah Johnson',
      subject: 'Bulk shipping rates',
      message: 'I\'m interested in shipping approximately 10 packages per month from UK to Zimbabwe. Can you provide me with bulk shipping rates?',
      status: 'in_progress',
      priority: 'high',
      assigned_to: 'admin-user',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    },
    {
      id: '3',
      user_id: 'u3',
      user_email: 'support-test@example.com',
      user_name: 'Michael Brown',
      subject: 'Invoice correction request',
      message: 'The invoice I received for shipment ZIM-54321 has incorrect weight information. The package was 5kg but I was charged for 8kg.',
      status: 'resolved',
      priority: 'low',
      assigned_to: 'admin-user',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
      updated_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
    },
  ];
  
  // Mock ticket responses
  const mockResponses: TicketResponse[] = [
    {
      id: 'r1',
      ticket_id: '2',
      user_id: 'admin-user',
      user_email: 'admin@zimbabweshipping.com',
      user_name: 'Admin User',
      message: 'Hi Sarah, thank you for your interest in our bulk shipping rates. For 10 packages per month, we can offer a 15% discount on our standard rates. Would you like me to prepare a detailed quote?',
      is_staff_response: true,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    },
    {
      id: 'r2',
      ticket_id: '2',
      user_id: 'u2',
      user_email: 'business@example.com',
      user_name: 'Sarah Johnson',
      message: 'Yes please, that would be very helpful. The packages would typically weigh between 2-5kg each.',
      is_staff_response: false,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    },
    {
      id: 'r3',
      ticket_id: '2',
      user_id: 'admin-user',
      user_email: 'admin@zimbabweshipping.com',
      user_name: 'Admin User',
      message: 'Thank you for the additional information. I've prepared a detailed quote and will email it to you shortly. Is there anything specific you'd like me to include in the quote?',
      is_staff_response: true,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    },
    {
      id: 'r4',
      ticket_id: '3',
      user_id: 'admin-user',
      user_email: 'admin@zimbabweshipping.com',
      user_name: 'Admin User',
      message: 'Hello Michael, I've reviewed your invoice and confirm that there was an error in the weight calculation. I've issued a corrected invoice and processed a refund for the difference. You should receive the refund within 3-5 business days. Please let me know if you have any other questions.',
      is_staff_response: true,
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(), // 8 days ago
    },
    {
      id: 'r5',
      ticket_id: '3',
      user_id: 'u3',
      user_email: 'support-test@example.com',
      user_name: 'Michael Brown',
      message: 'Thank you for resolving this quickly. I appreciate the help!',
      is_staff_response: false,
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
    },
  ];

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // In a real app, this would be a fetch to the database
      // For now, we'll use the mock data
      setTickets(mockTickets);
    } catch (error) {
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

  const handleTicketClick = (ticket: Ticket) => {
    setCurrentTicket(ticket);
    
    // In a real app, this would fetch responses from the database
    // For now, we'll filter the mock responses
    const ticketReplies = mockResponses.filter(r => r.ticket_id === ticket.id);
    setTicketResponses(ticketReplies);
    
    setReplyText('');
    setIsTicketDialogOpen(true);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      // In a real app, this would update the database
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId 
          ? {...ticket, status: newStatus, updated_at: new Date().toISOString()} 
          : ticket
      ));
      
      if (currentTicket?.id === ticketId) {
        setCurrentTicket({...currentTicket, status: newStatus, updated_at: new Date().toISOString()});
      }
      
      toast({
        title: 'Status updated',
        description: `Ticket status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      // In a real app, this would update the database
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId 
          ? {...ticket, priority: newPriority, updated_at: new Date().toISOString()} 
          : ticket
      ));
      
      if (currentTicket?.id === ticketId) {
        setCurrentTicket({...currentTicket, priority: newPriority, updated_at: new Date().toISOString()});
      }
      
      toast({
        title: 'Priority updated',
        description: `Ticket priority changed to ${newPriority}`,
      });
    } catch (error) {
      console.error('Error updating ticket priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket priority',
        variant: 'destructive',
      });
    }
  };

  const handleReply = async () => {
    if (!currentTicket || !replyText.trim()) return;
    
    setReplying(true);
    try {
      // In a real app, this would save to the database
      const newResponse: TicketResponse = {
        id: `new-${Date.now()}`,
        ticket_id: currentTicket.id,
        user_id: 'admin-user',
        user_email: 'admin@zimbabweshipping.com',
        user_name: 'Admin User',
        message: replyText.trim(),
        is_staff_response: true,
        created_at: new Date().toISOString(),
      };
      
      setTicketResponses([...ticketResponses, newResponse]);
      
      // Update ticket status to in_progress if it was open
      if (currentTicket.status === 'open') {
        handleStatusChange(currentTicket.id, 'in_progress');
      }
      
      setReplyText('');
      
      toast({
        title: 'Reply sent',
        description: 'Your response has been sent to the customer',
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setReplying(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      searchQuery === '' ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      ticket.status === statusFilter;
    
    const matchesPriority = 
      priorityFilter === 'all' ||
      ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <MessageCircle className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-500">
            {status}
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Low
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-500">
            {priority}
          </Badge>
        );
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              <div>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
              </div>
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
          <Tabs defaultValue="all" className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
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
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
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
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-zim-green" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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
                    <TableHead>Last Update</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} onClick={() => handleTicketClick(ticket)} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{ticket.user_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <span>{ticket.user_name || ticket.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>
                        {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(ticket);
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

      {/* Ticket detail dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {currentTicket && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl">{currentTicket.subject}</DialogTitle>
                    <DialogDescription>
                      Ticket #{currentTicket.id} · {format(new Date(currentTicket.created_at), 'PPp')}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={currentTicket.status}
                      onValueChange={(value) => handleStatusChange(currentTicket.id, value)}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={currentTicket.priority}
                      onValueChange={(value) => handlePriorityChange(currentTicket.id, value)}
                    >
                      <SelectTrigger className="w-[100px] h-8">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="mt-6 space-y-6">
                {/* Initial ticket message */}
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {currentTicket.user_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{currentTicket.user_name || 'User'}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(currentTicket.created_at), 'PPp')}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{currentTicket.message}</p>
                    </div>
                  </div>
                </div>
                
                {/* Ticket responses */}
                {ticketResponses.map(response => (
                  <div key={response.id} className="flex gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {response.user_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium">
                          {response.user_name || 'User'} 
                          {response.is_staff_response && <span className="ml-2 text-xs bg-zim-green text-white px-2 py-0.5 rounded">Staff</span>}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(response.created_at), 'PPp')}
                        </p>
                      </div>
                      <div className={`rounded-lg p-4 ${
                        response.is_staff_response 
                          ? 'bg-blue-50' 
                          : 'bg-gray-50'
                      }`}>
                        <p className="whitespace-pre-wrap">{response.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Reply form */}
                {currentTicket.status !== 'closed' && (
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-medium mb-3">Add Reply</h3>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response here..."
                      className="min-h-[100px] mb-3"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleReply}
                        className="bg-zim-green hover:bg-zim-green/90"
                        disabled={!replyText.trim() || replying}
                      >
                        {replying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;
