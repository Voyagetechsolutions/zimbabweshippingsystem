
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Truck, 
  FileText, 
  Bell, 
  Search, 
  PlusCircle, 
  Eye,
  CalendarCheck,
  MessageSquare,
  Clock,
  ChevronRight
} from 'lucide-react';
import { RecentShipments } from '@/components/customer/RecentShipments';

// Define type for shipment metadata to help TypeScript understand the structure
interface ShipmentMetadata {
  pickup_date?: string;
  [key: string]: any;
}

// Helper function to get status badge styling
const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (true) {
    case statusLower.includes('booking confirmed'):
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{status}</Badge>;
    case statusLower.includes('ready for pickup'):
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{status}</Badge>;
    case statusLower.includes('processing'):
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">{status}</Badge>;
    case statusLower.includes('customs'):
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300">{status}</Badge>;
    case statusLower.includes('transit'):
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{status}</Badge>;
    case statusLower.includes('out for delivery'):
      return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">{status}</Badge>;
    case statusLower.includes('delivered'):
      return <Badge className="bg-green-100 text-green-800 border-green-300">{status}</Badge>;
    case statusLower.includes('cancelled'):
      return <Badge className="bg-red-100 text-red-800 border-red-300">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user's shipments
  const { data: shipments, isLoading: shipmentLoading } = useQuery({
    queryKey: ['user-shipments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's support tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter shipments based on search query
  const filteredShipments = shipments?.filter(shipment =>
    searchQuery === '' ||
    shipment.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.status.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Count shipments by status
  const activeShipments = shipments?.filter(s => s.status !== 'Delivered' && s.status !== 'Cancelled').length || 0;
  const deliveredShipments = shipments?.filter(s => s.status === 'Delivered').length || 0;
  const pendingCollection = shipments?.filter(s => 
    s.status === 'Booking Confirmed' || s.status === 'Ready for Pickup'
  ).length || 0;

  // Helper function to safely get pickup_date from metadata
  const getPickupDate = (shipment: any): string | undefined => {
    if (!shipment.metadata) return undefined;
    
    // Handle both string and object formats of metadata
    if (typeof shipment.metadata === 'string') {
      try {
        const parsed = JSON.parse(shipment.metadata);
        return parsed.pickup_date;
      } catch {
        return undefined;
      }
    }
    
    return shipment.metadata.pickup_date;
  };

  // For skeleton loading
  const loadingArray = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">{activeShipments}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-yellow-500 mr-3" />
              <div className="text-2xl font-bold">{pendingCollection}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">{deliveredShipments}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button asChild className="bg-zim-green hover:bg-zim-green/90 h-auto py-3">
          <Link to="/book-shipment">
            <PlusCircle className="h-5 w-5 mr-2" />
            Book New Shipment
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="h-auto py-3">
          <Link to="/track">
            <Truck className="h-5 w-5 mr-2" />
            Track Shipment
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="h-auto py-3">
          <Link to="/support">
            <MessageSquare className="h-5 w-5 mr-2" />
            Contact Support
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="shipments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>My Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Support Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Recent Activity</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Shipments</CardTitle>
              <CardDescription>View and track all your shipments</CardDescription>
              
              <div className="flex justify-between items-center mt-3">
                <div className="relative w-full md:w-96">
                  <Input
                    placeholder="Search by tracking #, status, or destination"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shipmentLoading ? (
                <div className="animate-pulse space-y-4">
                  {loadingArray.map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No shipments found</h3>
                  <p className="text-gray-500 mb-6 mt-1">
                    {searchQuery 
                      ? "Try adjusting your search" 
                      : "You don't have any shipments yet"}
                  </p>
                  <Button asChild>
                    <Link to="/book-shipment">Book Your First Shipment</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking #</TableHead>
                        <TableHead className="hidden md:table-cell">From</TableHead>
                        <TableHead className="hidden md:table-cell">To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="text-right">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                          <TableCell className="hidden md:table-cell max-w-[180px] truncate">
                            {shipment.origin}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[180px] truncate">
                            {shipment.destination}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(shipment.status)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-500">
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/shipment/${shipment.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <Button asChild variant="outline">
                <Link to="/book-shipment">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Book New Shipment
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="tickets" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>View and manage your support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="animate-pulse space-y-4">
                  {loadingArray.map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ) : tickets?.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No support tickets</h3>
                  <p className="text-gray-500 mb-6 mt-1">
                    You don't have any support tickets yet
                  </p>
                  <Button asChild>
                    <Link to="/support">Contact Support</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets?.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardHeader className="p-4">
                        <div className="flex justify-between">
                          <CardTitle className="text-base">{ticket.subject}</CardTitle>
                          <Badge 
                            variant={
                              ticket.status === 'Open' ? 'default' :
                              ticket.status === 'In Progress' ? 'outline' : 'secondary'
                            }
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center mt-1">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-gray-700 line-clamp-2">{ticket.message}</p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/support?ticket=${ticket.id}`}>
                            View Ticket
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <Button asChild variant="outline">
                <Link to="/support">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest notifications and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="animate-pulse space-y-4">
                  {loadingArray.map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ) : notifications?.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No activity yet</h3>
                  <p className="text-gray-500 mt-1">
                    You'll see notifications here once you have shipments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications?.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 rounded-lg border ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {notification.type}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-xs text-gray-500">
                          {format(new Date(notification.created_at), 'MMM d, yyyy')}
                        </span>
                        {notification.related_id && (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/shipment/${notification.related_id}`}>
                              View Shipment
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <Button asChild variant="outline">
                <Link to="/notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  View All Notifications
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Additional Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Collections</CardTitle>
              <CardDescription>
                Scheduled pickup dates for your shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shipmentLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ) : filteredShipments.filter(s => 
                (s.status === 'Booking Confirmed' || s.status === 'Ready for Pickup') && 
                getPickupDate(s)
              ).length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CalendarCheck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No scheduled collections</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredShipments
                    .filter(s => 
                      (s.status === 'Booking Confirmed' || s.status === 'Ready for Pickup') && 
                      getPickupDate(s)
                    )
                    .map((shipment) => (
                      <div 
                        key={shipment.id} 
                        className="flex justify-between items-center border-b pb-4"
                      >
                        <div>
                          <p className="font-medium">{shipment.tracking_number}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              {getPickupDate(shipment)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {shipment.origin}
                            </span>
                          </div>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/shipment/${shipment.id}`}>
                            Details
                          </Link>
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <RecentShipments />
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
