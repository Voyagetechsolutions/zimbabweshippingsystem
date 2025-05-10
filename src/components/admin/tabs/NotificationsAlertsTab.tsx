
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Search,
  RefreshCcw,
  Filter,
  EyeOff,
  Send,
  CheckCircle,
  BookOpen,
  AlertCircle,
  Package,
  CreditCard,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
  user_id: string | null;
  related_id: string | null;
  user?: {
    full_name: string | null;
    email: string;
  } | null;
}

const NotificationsAlertsTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          // Handle new notification
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast for new notification
          toast({
            title: 'New Notification',
            description: newNotification.title,
          });
        }
      )
      .subscribe();
      
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, typeFilter, timeFilter, activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          user:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (activeTab === 'system') {
      filtered = filtered.filter(n => !n.user_id);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        (n.user?.email && n.user.email.toLowerCase().includes(query)) ||
        (n.user?.full_name && n.user.full_name.toLowerCase().includes(query))
      );
    }

    // Filter by notification type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Filter by time
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      
      if (timeFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (timeFilter === 'week') {
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (timeFilter === 'month') {
        cutoff.setMonth(cutoff.getMonth() - 1);
      }
      
      filtered = filtered.filter(n => new Date(n.created_at) >= cutoff);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.is_read) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      
      toast({
        title: 'Notification marked as read',
        description: notification.title,
      });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      // Get IDs of unread notifications
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) {
        toast({
          title: 'No unread notifications',
          description: 'All notifications are already marked as read',
        });
        return;
      }
      
      // Update all unread notifications
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => 
        !n.is_read ? { ...n, is_read: true } : n
      ));
      
      toast({
        title: 'All notifications marked as read',
        description: `${unreadIds.length} notifications updated`,
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notifications',
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shipment_update':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'payment_confirmation':
        return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'system':
        return <Bell className="h-5 w-5 text-purple-500" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'support':
        return <HelpCircle className="h-5 w-5 text-yellow-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>All Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Unread</span>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <Badge className="ml-1 bg-red-100 text-red-800">
                {notifications.filter(n => !n.is_read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>System Alerts</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Notifications & Alerts</CardTitle>
                <CardDescription>Manage all system and user notifications</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark All as Read
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchNotifications}
                  className="flex items-center gap-1"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Input
                  placeholder="Search notifications..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="shipment_update">Shipment Updates</SelectItem>
                    <SelectItem value="payment_confirmation">Payment Confirmations</SelectItem>
                    <SelectItem value="status_update">Status Updates</SelectItem>
                    <SelectItem value="system">System Notifications</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="alert">Alerts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Time filter" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                <p className="text-gray-500">
                  {searchQuery || typeFilter !== 'all' || timeFilter !== 'all'
                    ? "Try adjusting your filters"
                    : activeTab === 'unread'
                    ? "No unread notifications"
                    : activeTab === 'system'
                    ? "No system alerts"
                    : "No notifications available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Notification</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notification) => (
                      <TableRow 
                        key={notification.id} 
                        className={notification.is_read ? '' : 'bg-blue-50 dark:bg-blue-950'}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className={`font-medium ${!notification.is_read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {notification.user ? (
                            <div>
                              <div className="font-medium">
                                {notification.user.full_name || 'Unnamed User'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {notification.user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`
                            ${notification.type === 'shipment_update' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                            ${notification.type === 'payment_confirmation' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                            ${notification.type === 'system' ? 'bg-purple-100 text-purple-800 border-purple-300' : ''}
                            ${notification.type === 'alert' ? 'bg-red-100 text-red-800 border-red-300' : ''}
                            ${notification.type === 'status_update' ? 'bg-orange-100 text-orange-800 border-orange-300' : ''}
                            ${notification.type === 'support' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                            ${!['shipment_update', 'payment_confirmation', 'system', 'alert', 'status_update', 'support'].includes(notification.type) ? 'bg-gray-100 text-gray-800 border-gray-300' : ''}
                          `}>
                            {notification.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(new Date(notification.created_at), 'MMM d, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {notification.is_read ? (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-300">Read</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">Unread</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification)}
                                className="flex items-center gap-1"
                              >
                                <EyeOff className="h-4 w-4" />
                                <span className="hidden md:inline">Mark as Read</span>
                              </Button>
                            )}
                            {notification.user_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement reply functionality
                                  toast({
                                    title: 'Reply',
                                    description: `Replying to ${notification.user?.full_name || notification.user?.email}`,
                                  });
                                }}
                                className="flex items-center gap-1"
                              >
                                <Send className="h-4 w-4" />
                                <span className="hidden md:inline">Reply</span>
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
      </Tabs>
    </div>
  );
};

export default NotificationsAlertsTab;
