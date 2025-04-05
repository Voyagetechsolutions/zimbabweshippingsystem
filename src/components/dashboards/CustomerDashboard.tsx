
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Search, Truck, Bell, MessageSquare, 
  Plus, Clock, Calendar, MapPin
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
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="bg-zim-green hover:bg-zim-green/90">
              <Link to="/create-shipment" className="flex items-center justify-center h-full">
                <Plus className="h-5 w-5 mr-2" />
                Book New Shipment
              </Link>
            </Button>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder="Track My Shipment" 
                className="w-full h-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-zim-green focus:outline-none focus:ring-1 focus:ring-zim-green"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrackShipment()}
              />
            </div>
            
            <Button asChild variant="outline">
              <Link to="/contact" className="flex items-center justify-center h-full">
                <MessageSquare className="h-5 w-5 mr-2" />
                Contact Support
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="mr-2 h-5 w-5 text-zim-green" />
            My Shipments
          </CardTitle>
          <CardDescription>Track and manage your shipments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : shipments.length > 0 ? (
            <div className="divide-y">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="py-4">
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
            <div className="text-center py-10">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">You don't have any shipments yet</p>
              <Button className="mt-4 bg-zim-green hover:bg-zim-green/90" asChild>
                <Link to="/create-shipment">Book Your First Shipment</Link>
              </Button>
            </div>
          )}
          
          {shipments.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button asChild variant="outline">
                <Link to="/dashboard">View All Shipments</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5 text-zim-green" />
            Notifications
          </CardTitle>
          <CardDescription>Recent updates and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex gap-3">
                  <div className={`${getNotificationColor(notification.type)} h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-gray-500">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy - h:mmaaa')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">You don't have any notifications yet</p>
            </div>
          )}
          
          {notifications.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button asChild variant="outline">
                <Link to="/notifications">View All Notifications</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
