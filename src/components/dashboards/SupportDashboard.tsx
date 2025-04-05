
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Clock, Bell, CheckCircle2, AlertCircle, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const fetchSupportTickets = async () => {
    try {
      setLoading(true);
      
      // Log to check if this function is being called
      console.log('Fetching support tickets...');
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in query:', error);
        throw error;
      }

      console.log('Fetched tickets:', data);

      if (data) {
        setTickets(data);
        
        // Compute stats
        const openCount = data.filter(t => t.status === 'Open').length;
        const closedCount = data.filter(t => t.status === 'Closed').length;
        const highPriorityCount = data.filter(t => t.priority === 'High').length;
        
        // Calculate response rate - the percentage of tickets that received a response
        const hasResponsesCount = await countTicketsWithResponses();
        const responseRate = data.length > 0 ? Math.round((hasResponsesCount / data.length) * 100) : 0;
        
        // Calculate average response time
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
  
  const countTicketsWithResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
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
      // This is a simplified calculation and would be more accurate with timestamps in the database
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
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
                        <Button size="sm" variant="outline">
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
                          <Button size="sm">
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
                        <Button size="sm" variant="outline">
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
    </div>
  );
};

export default SupportDashboard;
