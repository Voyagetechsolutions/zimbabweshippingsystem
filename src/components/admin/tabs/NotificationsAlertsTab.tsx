import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertCircle,
  Search,
  RefreshCw,
  Bell,
  CheckCircle,
  Trash2,
  Loader2
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

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  user_id: string;
  related_id?: string;
  user_email?: string;
  user_name?: string;
}

const NotificationsAlertsTab = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Get all notifications first
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (notificationsError) throw notificationsError;
      
      // For each notification, fetch the user profile data if user_id exists
      const enhancedNotifications = await Promise.all(
        notificationsData.map(async (notification) => {
          if (notification.user_id) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', notification.user_id)
              .single();
            
            if (!profileError && profileData) {
              return {
                ...notification,
                user_email: profileData.email,
                user_name: profileData.full_name
              };
            }
          }
          return notification;
        })
      );
      
      setNotifications(enhancedNotifications);
      setSelectedNotifications([]);
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

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      toast({
        title: 'Notification marked as read',
        description: 'The notification has been updated',
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

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== id)
      );
      
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed',
      });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async (action: 'read' | 'delete') => {
    if (selectedNotifications.length === 0) return;
    
    setBulkActionLoading(true);
    try {
      if (action === 'read') {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', selectedNotifications);
        
        if (error) throw error;
        
        // Update local state
        setNotifications(prevNotifications =>
          prevNotifications.map(notification =>
            selectedNotifications.includes(notification.id)
              ? { ...notification, is_read: true }
              : notification
          )
        );
        
        toast({
          title: 'Notifications updated',
          description: `${selectedNotifications.length} notifications marked as read`,
        });
      } else if (action === 'delete') {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .in('id', selectedNotifications);
        
        if (error) throw error;
        
        // Update local state
        setNotifications(prevNotifications =>
          prevNotifications.filter(notification => !selectedNotifications.includes(notification.id))
        );
        
        toast({
          title: 'Notifications deleted',
          description: `${selectedNotifications.length} notifications removed`,
        });
      }
      
      // Clear selection
      setSelectedNotifications([]);
    } catch (error: any) {
      console.error(`Error performing bulk action (${action}):`, error);
      toast({
        title: 'Error',
        description: 'Failed to update notifications',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const toggleSelectNotification = (id: string) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(selectedNotifications.filter(notifId => notifId !== id));
    } else {
      setSelectedNotifications([...selectedNotifications, id]);
    }
  };

  // Filter notifications based on search query, type filter, and read status
  const filteredNotifications = notifications.filter((notification) => {
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesReadStatus = 
      readFilter === 'all' || 
      (readFilter === 'read' && notification.is_read) || 
      (readFilter === 'unread' && !notification.is_read);
    
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesReadStatus && matchesSearch;
  });

  const getNotificationTypeBadge = (type: string) => {
    switch (type) {
      case 'shipment_update':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Shipment</Badge>;
      case 'quote_response':
        return <Badge className="bg-purple-100 text-purple-800 border border-purple-300">Quote</Badge>;
      case 'custom_quote':
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Custom Quote</Badge>;
      case 'payment':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Payment</Badge>;
      case 'system':
        return <Badge className="bg-gray-100 text-gray-800 border border-gray-300">System</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Notifications & Alerts</CardTitle>
            <CardDescription>
              Manage system notifications and user alerts
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchNotifications}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={typeFilter} 
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="shipment_update">Shipment</SelectItem>
                <SelectItem value="quote_response">Quote Response</SelectItem>
                <SelectItem value="custom_quote">Custom Quote</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={readFilter} 
              onValueChange={setReadFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedNotifications.length > 0 && (
            <div className="bg-muted p-2 rounded-md mb-4 flex items-center justify-between">
              <span className="text-sm">
                {selectedNotifications.length} {selectedNotifications.length === 1 ? 'item' : 'items'} selected
              </span>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('read')}
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Mark as Read
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={bulkActionLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the selected notifications. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600" 
                        onClick={() => handleBulkAction('delete')}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <AlertCircle className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-gray-500">No notifications found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotifications.map((notification) => (
                        <TableRow key={notification.id} className={notification.is_read ? '' : 'bg-muted/20'}>
                          <TableCell>
                            <Checkbox
                              checked={selectedNotifications.includes(notification.id)}
                              onCheckedChange={() => toggleSelectNotification(notification.id)}
                              aria-label={`Select ${notification.title}`}
                            />
                          </TableCell>
                          <TableCell>
                            {notification.is_read ? (
                              <div className="text-gray-500 flex items-center text-xs">
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Read
                              </div>
                            ) : (
                              <div className="text-blue-500 flex items-center text-xs">
                                <Bell className="h-3.5 w-3.5 mr-1" /> Unread
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getNotificationTypeBadge(notification.type)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{notification.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{notification.message}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{notification.user_name || 'Unknown User'}</div>
                              <div className="text-gray-500 text-xs">{notification.user_email || 'No email'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {!notification.is_read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark Read
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this notification? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600"
                                    onClick={() => deleteNotification(notification.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsAlertsTab;
