
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Search, Truck, Bell, MessageSquare, 
  Plus, Clock, Calendar, MapPin, ChevronRight,
  Home, Settings, User, Bookmark
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const CustomerDashboard = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user's shipments
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (shipmentError) throw shipmentError;
      setShipments(shipmentData || []);

      // Fetch user's notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (notificationError) throw notificationError;
      setNotifications(notificationData || []);

    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Error',
        description: 'Could not load your dashboard data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrackShipment = () => {
    if (!trackingNumber.trim()) {
      toast({
        title: 'Tracking number required',
        description: 'Please enter a valid tracking number to track your shipment.',
        variant: 'destructive'
      });
      return;
    }

    // Navigate to track page with the tracking number
    navigate(`/track?number=${encodeURIComponent(trackingNumber.trim())}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Booked':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Booked</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'Processing':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>;
      case 'In Transit':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Transit</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Delivered</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shipment_update':
        return <Truck className="h-5 w-5" />;
      case 'payment':
        return <Package className="h-5 w-5" />;
      case 'support':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'shipment_update':
        return 'bg-blue-100 text-blue-600';
      case 'payment':
        return 'bg-green-100 text-green-600';
      case 'support':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                Welcome back, {user?.user_metadata?.full_name || user?.email}
              </h2>
              <p className="text-gray-600">Manage your shipments and track your packages in one place</p>
            </div>
            <div className="flex gap-3">
              <Button asChild className="bg-zim-green hover:bg-zim-green/90 shadow-sm">
                <Link to="/book-shipment" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Book Shipment
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Link to="/book-shipment" className="block p-5">
              <div className="flex items-center gap-4">
                <div className="bg-zim-green/10 rounded-full p-3">
                  <Plus className="h-5 w-5 text-zim-green" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Book Shipment</h3>
                  <p className="text-sm text-gray-500">Create a new shipment</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Link to="/track" className="block p-5">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Track Shipment</h3>
                  <p className="text-sm text-gray-500">View shipment status</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Link to="/address-book" className="block p-5">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 rounded-full p-3">
                  <Bookmark className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Address Book</h3>
                  <p className="text-sm text-gray-500">Manage saved addresses</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Link to="/support" className="block p-5">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 rounded-full p-3">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Get Support</h3>
                  <p className="text-sm text-gray-500">Contact our team</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* Search Shipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5 text-zim-green" />
            Track Your Shipment
          </CardTitle>
          <CardDescription>Enter your tracking number to track your shipment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder="Enter your tracking number" 
                className="w-full h-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-zim-green focus:outline-none focus:ring-1 focus:ring-zim-green"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrackShipment()}
              />
            </div>
            <Button 
              onClick={handleTrackShipment}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              Track Now
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Shipments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="mr-2 h-5 w-5 text-zim-green" />
            My Recent Shipments
          </CardTitle>
          <CardDescription>Track and manage your recent shipments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : shipments.length > 0 ? (
            <div className="divide-y">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="py-4 hover:bg-gray-50 rounded-lg transition-colors px-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">Shipment to {shipment.destination}</h4>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                        <span className="text-sm text-gray-500 font-mono">{shipment.tracking_number}</span>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" /> {shipment.origin} to {shipment.destination}
                        </div>
                      </div>
                      <div className="mt-2">
                        {getStatusBadge(shipment.status)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" /> 
                        <span>Booked: {format(new Date(shipment.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                      {shipment.estimated_delivery && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="h-3 w-3 mr-1" /> 
                          <span>Delivery: {format(new Date(shipment.estimated_delivery), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/track?number=${encodeURIComponent(shipment.tracking_number)}`)}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Track
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/shipment/${shipment.id}`)}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium mb-2">You don't have any shipments yet</p>
              <p className="text-gray-500 max-w-md mx-auto mb-4">Book your first shipment to start shipping packages from UK to Zimbabwe</p>
              <Button className="mt-2 bg-zim-green hover:bg-zim-green/90" asChild>
                <Link to="/book-shipment">Book Your First Shipment</Link>
              </Button>
            </div>
          )}
        </CardContent>
        {shipments.length > 0 && (
          <CardFooter className="pb-6 pt-2">
            <Button asChild variant="outline" className="w-full">
              <Link to="/shipment-history" className="flex items-center justify-center">
                View All Shipments
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5 text-zim-green" />
            Recent Notifications
          </CardTitle>
          <CardDescription>Updates about your shipments and account</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`${getNotificationColor(notification.type)} h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy - h:mmaaa')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium mb-2">No notifications yet</p>
              <p className="text-gray-500">We'll notify you about important updates to your shipments</p>
            </div>
          )}
        </CardContent>
        {notifications.length > 0 && (
          <CardFooter className="pb-6 pt-2">
            <Button asChild variant="outline" className="w-full">
              <Link to="/notifications" className="flex items-center justify-center">
                View All Notifications
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Help Card */}
      <Card className="bg-gray-50 border-none">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium mb-1">Need Help?</h3>
              <p className="text-gray-600">Our support team is here to assist you with your shipping needs</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/contact" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Contact Support
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
