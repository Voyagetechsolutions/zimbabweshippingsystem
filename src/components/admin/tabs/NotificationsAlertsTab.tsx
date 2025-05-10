
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell,
  Search,
  Settings,
  MoreHorizontal, 
  Check,
  Trash,
  Plus,
  MessageSquare,
  AlertTriangle,
  Package,
  Info,
  UserCog,
  RefreshCw,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id?: string;
  created_at: string;
  is_read: boolean;
  user_id: string;
}

const NotificationsAlertsTab = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // New notification state
  const [showNewNotificationDialog, setShowNewNotificationDialog] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationUsers, setNotificationUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Function to setup real-time subscription
  const setupRealtimeSubscription = () => {
    // First, add the notifications table to the realtime publication
    supabase.rpc('enable_realtime_for_table', { table_name: 'notifications' });
    
    // Set up subscription to notifications table
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('New notification:', payload);
          // Add the new notification to the state
          const newNotification = payload.new as Notification;
          setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
          
          // Show a toast alert
          toast({
            title: 'New notification',
            description: newNotification.title
          });
        }
      )
      .subscribe();
      
    // Return the subscription for cleanup
    return subscription;
  };

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    
    // Setup real-time subscription and clean up on unmount
    const subscription = setupRealtimeSubscription();
    
    return () => {
      // Clean up subscription
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
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
  
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setNotificationUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
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
      setNotifications(notifications.map(notification => 
        notification.id === id ? {...notification, is_read: true} : notification
      ));
      
      toast({
        title: 'Notification marked as read',
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
      setNotifications(notifications.filter(notification => notification.id !== id));
      
      toast({
        title: 'Notification deleted',
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

  const sendNewNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast({
        title: 'Missing information',
        description: 'Please provide a title and message',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (selectedUsers.length === 0) {
        // Send to all users (system notification)
        const { error } = await supabase
          .from('notifications')
          .insert({
            title: newNotification.title,
            message: newNotification.message,
            type: newNotification.type,
            user_id: '00000000-0000-0000-0000-000000000000', // System ID for global notifications
            is_read: false
          });
        
        if (error) throw error;
      } else {
        // Send to selected users
        const notifications = selectedUsers.map(userId => ({
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          user_id: userId,
          is_read: false
        }));
        
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);
        
        if (error) throw error;
      }
      
      // Reset form and close dialog
      setNewNotification({
        title: '',
        message: '',
        type: 'info'
      });
      setSelectedUsers([]);
      setShowNewNotificationDialog(false);
      
      // Show success message and refresh notifications
      toast({
        title: 'Notification sent',
        description: selectedUsers.length > 0 
          ? `Sent to ${selectedUsers.length} users` 
          : 'Sent to all users'
      });
      
      fetchNotifications();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter notifications based on search query and active tab
  const filteredNotifications = notifications.filter(notification => {
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'unread' && !notification.is_read) ||
      (activeTab === 'read' && notification.is_read) ||
      (activeTab === notification.type);
    
    const matchesSearch = 
      !searchQuery || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shipment':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'user':
        return <UserCog className="h-5 w-5 text-purple-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-cyan-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notifications & Alerts</CardTitle>
            <CardDescription>
              Manage system notifications and user alerts
            </CardDescription>
          </div>
          
          <Button onClick={() => setShowNewNotificationDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Notification
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button 
                variant="outline" 
                onClick={fetchNotifications}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <Tabs 
              defaultValue="all" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 md:grid-cols-7 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="shipment">Shipments</TabsTrigger>
                <TabsTrigger value="user">Users</TabsTrigger>
                <TabsTrigger value="warning">Warnings</TabsTrigger>
                <TabsTrigger value="message">Messages</TabsTrigger>
                <TabsTrigger value="read">Archived</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No notifications found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {searchQuery || activeTab !== 'all' ? 
                        "Try adjusting your filters" : 
                        "Your notification inbox is empty"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredNotifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border rounded-lg p-4 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{notification.title}</h3>
                                {!notification.is_read && (
                                  <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <div className="text-xs text-gray-500 mt-2">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {!notification.is_read && (
                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as Read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteNotification(notification.id)}>
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
      
      {/* New Notification Dialog */}
      <Dialog open={showNewNotificationDialog} onOpenChange={setShowNewNotificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Notification</DialogTitle>
            <DialogDescription>
              Send a notification to users or system-wide
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                placeholder="e.g. System Maintenance"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Notification Message</Label>
              <Textarea
                id="message"
                value={newNotification.message}
                onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                placeholder="e.g. The system will be unavailable for maintenance on..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="type">Notification Type</Label>
              <Select
                value={newNotification.type}
                onValueChange={(value) => setNewNotification({...newNotification, type: value})}
              >
                <SelectTrigger id="type" className="mt-1">
                  <SelectValue placeholder="Select notification type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="shipment">Shipment Update</SelectItem>
                  <SelectItem value="user">User Account</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Recipients (Optional)</Label>
              <p className="text-xs text-gray-500 mb-2">
                If no recipients are selected, the notification will be sent system-wide.
              </p>
              
              <Select
                value={selectedUsers.length ? "custom" : "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedUsers([]);
                  }
                }}
              >
                <SelectTrigger className="mb-2">
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="custom">Select Specific Users</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedUsers.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedUsers.map((userId) => {
                      const user = notificationUsers.find(u => u.id === userId);
                      return (
                        <Badge 
                          key={userId} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {user?.full_name || user?.email || 'Unknown User'}
                          <button
                            onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
                            className="ml-1 h-4 w-4 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-400"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
              
              {/* User selection when custom is active */}
              {selectedUsers.length > 0 && (
                <div className="h-[150px] overflow-y-auto border rounded-md mt-2 p-2">
                  {notificationUsers.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center py-1 px-2 hover:bg-gray-100 rounded-sm cursor-pointer"
                      onClick={() => {
                        if (selectedUsers.includes(user.id)) {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        } else {
                          setSelectedUsers([...selectedUsers, user.id]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {user.full_name || 'Unnamed User'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email} • {user.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowNewNotificationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={sendNewNotification}
              disabled={isSubmitting || !newNotification.title || !newNotification.message}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationsAlertsTab;
