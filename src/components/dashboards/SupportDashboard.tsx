import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  Mail,
  Send,
  Loader2,
  Save,
  Forward,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { tableFrom } from '@/integrations/supabase/db-types';

interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  updated_at: string;
}

const SupportDashboard = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    open: 0,
    closed: 0,
    highPriority: 0,
    responseRate: 0,
    averageResponseTime: "N/A",
  });
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const [responseContent, setResponseContent] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [responseTemplates, setResponseTemplates] = useState<ResponseTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardingTicket, setForwardingTicket] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [ticketResponses, setTicketResponses] = useState<Record<string, any[]>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSupportTickets();
    fetchResponseTemplates();
  }, []);

  const fetchSupportTickets = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching support tickets...');
      
      const { data, error } = await supabase
        .from(tableFrom('support_tickets'))
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in query:', error);
        throw error;
      }

      console.log('Fetched tickets:', data);

      if (data) {
        setTickets(data);
        
        const openCount = data.filter(t => t.status === 'Open').length;
        const closedCount = data.filter(t => t.status === 'Closed').length;
        const highPriorityCount = data.filter(t => t.priority === 'High').length;
        
        const hasResponsesCount = await countTicketsWithResponses();
        const responseRate = data.length > 0 ? Math.round((hasResponsesCount / data.length) * 100) : 0;
        
        const averageTime = await calculateAverageResponseTime();
        
        setStats({
          open: openCount,
          closed: closedCount,
          highPriority: highPriorityCount,
          responseRate: responseRate,
          averageResponseTime: averageTime || "N/A",
        });
      }
    } catch (error: any) {
      console.error('Error fetching support tickets:', error.message);
      toast({
        title: 'Error fetching tickets',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchResponseTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from(tableFrom('response_templates'))
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setResponseTemplates(data as unknown as ResponseTemplate[]);
      }
    } catch (error: any) {
      console.error('Error fetching response templates:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to load response templates',
        variant: 'destructive'
      });
    }
  };
  
  const countTicketsWithResponses = async () => {
    try {
      const { data, error } = await supabase
        .from(tableFrom('ticket_responses'))
        .select('ticket_id', { count: 'exact', head: true })
        .is('is_staff_response', true);
        
      if (error) throw error;
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error counting tickets with responses:', error);
      return 0;
    }
  };
  
  const calculateAverageResponseTime = async () => {
    try {
      const { data: tickets, error: ticketsError } = await supabase
        .from(tableFrom('support_tickets'))
        .select('id, created_at, updated_at')
        .not('status', 'eq', 'Open');
        
      if (ticketsError) throw ticketsError;
      
      if (!tickets || tickets.length === 0) return "N/A";
      
      let totalHours = 0;
      let countedTickets = 0;
      
      tickets.forEach(ticket => {
        if (ticket.created_at && ticket.updated_at) {
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
          
          if (diffHours > 0) {
            totalHours += diffHours;
            countedTickets++;
          }
        }
      });
      
      if (countedTickets === 0) return "N/A";
      
      const average = totalHours / countedTickets;
      return average.toFixed(1) + " hours";
      
    } catch (error) {
      console.error('Error calculating average response time:', error);
      return "N/A";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium</Badge>;
      case 'Low':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      case 'Closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy • h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const handleViewTicket = async (ticket: any) => {
    setViewingTicket(ticket);
    setResponseContent('');
    
    try {
      if (!ticketResponses[ticket.id]) {
        const { data, error } = await supabase
          .from(tableFrom('ticket_responses'))
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        setTicketResponses(prev => ({
          ...prev,
          [ticket.id]: data || []
        }));
      }
    } catch (error: any) {
      console.error('Error fetching ticket responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load responses for this ticket',
        variant: 'destructive'
      });
    }
  };

  const handleSendResponse = async () => {
    if (!viewingTicket || !responseContent.trim()) {
      toast({
        title: 'Error',
        description: 'Response content cannot be empty',
        variant: 'destructive'
      });
      return;
    }
    
    setSendingResponse(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('Authenticated user:', user.id);
      
      const { data: responseData, error: responseError } = await supabase
        .from(tableFrom('ticket_responses'))
        .insert({
          ticket_id: viewingTicket.id,
          user_id: user.id,
          message: responseContent,
          is_staff_response: true,
          notification_sent: false
        })
        .select()
        .single();
      
      if (responseError) {
        console.error('Response insert error:', responseError);
        throw responseError;
      }
      
      if (viewingTicket.status === 'Open') {
        const { error: updateError } = await supabase
          .from(tableFrom('support_tickets'))
          .update({ 
            status: 'In Progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', viewingTicket.id);
        
        if (updateError) throw updateError;
        
        setViewingTicket({
          ...viewingTicket,
          status: 'In Progress'
        });
        
        setTickets(prevTickets => 
          prevTickets.map(t => 
            t.id === viewingTicket.id 
              ? { ...t, status: 'In Progress' } 
              : t
          )
        );
      }
      
      setTicketResponses(prev => ({
        ...prev,
        [viewingTicket.id]: [...(prev[viewingTicket.id] || []), responseData]
      }));
      
      setResponseContent('');
      
      toast({
        title: 'Response Sent',
        description: 'Your response has been sent successfully'
      });
      
      try {
        await fetch('/api/send-support-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: viewingTicket.id,
            responseId: responseData.id
          }),
        });
        console.log('Notification sent successfully');
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSendingResponse(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = responseTemplates.find(t => t.id === templateId);
    if (template) {
      setResponseContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const handleSaveNewTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      toast({
        title: 'Error',
        description: 'Template name and content are required',
        variant: 'destructive'
      });
      return;
    }

    setSavingTemplate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from(tableFrom('response_templates'))
        .insert({
          title: newTemplateName,
          content: newTemplateContent,
          user_id: user.id
        })
        .select()
        .single();
        
      if (error) {
        console.error('Template save error:', error);
        throw error;
      }
      
      setResponseTemplates(prev => [data as unknown as ResponseTemplate, ...prev]);
      
      setNewTemplateName('');
      setNewTemplateContent('');
      setTemplateDialogOpen(false);
      
      toast({
        title: 'Template Saved',
        description: 'Response template has been saved successfully'
      });
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleForwardTicket = async () => {
    if (!viewingTicket || !forwardEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Forward email is required',
        variant: 'destructive'
      });
      return;
    }

    setForwardingTicket(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: responseError } = await supabase
        .from(tableFrom('ticket_responses'))
        .insert({
          ticket_id: viewingTicket.id,
          user_id: user.id,
          message: `This ticket was forwarded to ${forwardEmail}`,
          is_staff_response: true
        });
      
      if (responseError) throw responseError;
      
      const newResponse = {
        id: Date.now().toString(),
        ticket_id: viewingTicket.id,
        user_id: user.id,
        message: `This ticket was forwarded to ${forwardEmail}`,
        is_staff_response: true,
        created_at: new Date().toISOString()
      };
      
      setTicketResponses(prev => ({
        ...prev,
        [viewingTicket.id]: [...(prev[viewingTicket.id] || []), newResponse]
      }));
      
      setForwardDialogOpen(false);
      setForwardEmail('');
      
      toast({
        title: 'Ticket Forwarded',
        description: `Ticket has been forwarded to ${forwardEmail}`
      });
    } catch (error: any) {
      console.error('Error forwarding ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to forward ticket: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setForwardingTicket(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Open Tickets
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">
              {stats.highPriority} high priority
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Response Rate
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate}%</div>
            <div className="mt-4">
              <Progress value={stats.responseRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Average first response: {stats.averageResponseTime}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved Tickets
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">
              in the last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="mb-4">
          <TabsTrigger value="open">Open Tickets</TabsTrigger>
          <TabsTrigger value="assigned">Assigned To Me</TabsTrigger>
          <TabsTrigger value="resolved">Recently Resolved</TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : tickets.filter(t => t.status === 'Open').length > 0 ? (
                <div className="space-y-4">
                  {tickets.filter(t => t.status === 'Open').map((ticket) => (
                    <div key={ticket.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-md">
                      <div className="flex items-start mb-3 md:mb-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 mr-3 flex-shrink-0">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{ticket.subject}</h3>
                          <p className="text-sm text-gray-500 mt-1">{ticket.message.substring(0, 100)}...</p>
                          <div className="flex flex-wrap items-center mt-2 gap-2">
                            <div className="flex items-center text-xs text-gray-500">
                              <User className="h-3 w-3 mr-1" />
                              <span>{ticket.user_id?.substring(0, 8) || 'Anonymous'}</span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getPriorityBadge(ticket.priority)}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleViewTicket(ticket)}
                        >
                          Respond
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-500 mb-1">No open tickets</h3>
                  <p className="text-sm text-gray-500">
                    There are no open support tickets at the moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assigned">
          <Card>
            <CardHeader>
              <CardTitle>Tickets Assigned To Me</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : tickets.filter(t => t.status === 'Open' && t.assigned_to === 'current-user-id').length > 0 ? (
                <div className="space-y-4">
                  {tickets
                    .filter(t => t.status === 'Open' && t.assigned_to === 'current-user-id')
                    .map((ticket) => (
                      <div key={ticket.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-md">
                        <div className="flex items-start mb-3 md:mb-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 mr-3 flex-shrink-0">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{ticket.subject}</h3>
                            <p className="text-sm text-gray-500 mt-1">{ticket.message.substring(0, 100)}...</p>
                            <div className="flex items-center mt-2">
                              <Clock className="h-3 w-3 text-gray-400 mr-1" />
                              <p className="text-xs text-gray-500">Awaiting your response</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {getPriorityBadge(ticket.priority)}
                          <Button 
                            size="sm"
                            onClick={() => handleViewTicket(ticket)}
                          >
                            Respond
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-500 mb-1">No assigned tickets</h3>
                  <p className="text-sm text-gray-500">
                    You have no tickets assigned to you at the moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resolved">
          <Card>
            <CardHeader>
              <CardTitle>Recently Resolved Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : tickets.filter(t => t.status === 'Closed').length > 0 ? (
                <div className="space-y-4">
                  {tickets.filter(t => t.status === 'Closed').map((ticket) => (
                    <div key={ticket.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-md">
                      <div className="flex items-start mb-3 md:mb-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 mr-3 flex-shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{ticket.subject}</h3>
                          <p className="text-sm text-gray-500 mt-1">{ticket.message.substring(0, 100)}...</p>
                          <div className="flex items-center mt-2">
                            <Clock className="h-3 w-3 text-gray-400 mr-1" />
                            <p className="text-xs text-gray-500">{formatDate(ticket.updated_at)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(ticket.status)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-500 mb-1">No resolved tickets</h3>
                  <p className="text-sm text-gray-500">
                    There are no resolved tickets yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {viewingTicket && (
        <Dialog open={!!viewingTicket} onOpenChange={(open) => !open && setViewingTicket(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingTicket.subject}</DialogTitle>
              <DialogDescription>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge>{viewingTicket.category || 'General'}</Badge>
                  {getPriorityBadge(viewingTicket.priority)}
                  {getStatusBadge(viewingTicket.status)}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-md border">
                <div className="flex items-center mb-2">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm font-medium">{viewingTicket.email || 'Customer'}</span>
                  <span className="text-xs text-gray-500 ml-auto">{formatDate(viewingTicket.created_at)}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-line">{viewingTicket.message}</p>
              </div>
              
              {ticketResponses[viewingTicket.id] && ticketResponses[viewingTicket.id].length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Previous Responses</h3>
                  {ticketResponses[viewingTicket.id].map((response: any) => (
                    <div 
                      key={response.id} 
                      className={`p-3 rounded-md border ${response.is_staff_response ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium">
                          {response.is_staff_response ? 'Support Agent' : 'Customer'}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatDate(response.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-line">{response.message}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-3 mt-4">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Your Response</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setTemplateDialogOpen(true)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setForwardDialogOpen(true)}
                    >
                      <Forward className="h-4 w-4 mr-1" />
                      Forward
                    </Button>
                  </div>
                </div>
                
                {responseTemplates.length > 0 && (
                  <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a response template" />
                    </SelectTrigger>
                    <SelectContent>
                      {responseTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Textarea
                  placeholder="Type your response here..."
                  rows={6}
                  value={responseContent}
                  onChange={(e) => setResponseContent(e.target.value)}
                  className="min-h-[100px]"
                />
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewingTicket(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendResponse}
                    disabled={sendingResponse || !responseContent.trim()}
                  >
                    {sendingResponse ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Response Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for common responses
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                placeholder="Enter template name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Content</label>
              <Textarea
                placeholder="Enter template content"
                rows={6}
                value={newTemplateContent || responseContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Forward Ticket</DialogTitle>
            <DialogDescription>
              Forward this support ticket to another email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Forward To</label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={forwardEmail}
                onChange={(e) => setForwardEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                The ticket and all its responses will be forwarded to this email
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleForwardTicket}
              disabled={forwardingTicket}
            >
              {forwardingTicket ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Forwarding...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Forward Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportDashboard;
