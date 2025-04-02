
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Package, TruckIcon, BarChart, PlusCircle, Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Define types for our data
interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  carrier: string;
  estimated_delivery: string;
  created_at: string;
}

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'in-transit': 'bg-blue-100 text-blue-800',
  'delivered': 'bg-green-100 text-green-800',
  'delayed': 'bg-red-100 text-red-800',
}

const Dashboard = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeShipments, setActiveShipments] = useState<Shipment[]>([]);
  const [deliveredShipments, setDeliveredShipments] = useState<Shipment[]>([]);
  
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setShipments(data || []);
        setActiveShipments(data?.filter(s => s.status !== 'delivered') || []);
        setDeliveredShipments(data?.filter(s => s.status === 'delivered') || []);
      } catch (error) {
        console.error('Error fetching shipments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchShipments();
    }
  }, [user]);
  
  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
        <Button className="mt-4 md:mt-0 bg-zim-green hover:bg-zim-green/90 flex items-center">
          <PlusCircle className="mr-2 h-5 w-5" />
          New Shipment
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Package className="mr-2 h-5 w-5 text-zim-green" />
              Active Shipments
            </CardTitle>
            <CardDescription>Your shipments in transit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeShipments.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <TruckIcon className="mr-2 h-5 w-5 text-zim-yellow" />
              Delivered
            </CardTitle>
            <CardDescription>Successfully delivered packages</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{deliveredShipments.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-zim-red" />
              Total Shipments
            </CardTitle>
            <CardDescription>All-time shipments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{shipments.length}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Shipments</CardTitle>
          <CardDescription>Track and manage your shipping activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : shipments.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {shipments.map((shipment) => (
                    <ShipmentItem key={shipment.id} shipment={shipment} />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </TabsContent>
            
            <TabsContent value="active">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : activeShipments.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {activeShipments.map((shipment) => (
                    <ShipmentItem key={shipment.id} shipment={shipment} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No active shipments found." />
              )}
            </TabsContent>
            
            <TabsContent value="delivered">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : deliveredShipments.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {deliveredShipments.map((shipment) => (
                    <ShipmentItem key={shipment.id} shipment={shipment} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No delivered shipments yet." />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const ShipmentItem = ({ shipment }: { shipment: Shipment }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center">
          <div className="mr-4">
            <Package className="h-10 w-10 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium">{shipment.tracking_number}</h3>
            <p className="text-sm text-gray-500">
              {shipment.origin} to {shipment.destination}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <Badge className={`mr-3 ${getStatusColor(shipment.status)}`}>
            {shipment.status}
          </Badge>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <span className="sr-only">Toggle</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      
      <CollapsibleContent>
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 flex items-center mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="font-medium mr-2">From:</span> {shipment.origin}
              </p>
              <p className="text-sm text-gray-500 flex items-center mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="font-medium mr-2">To:</span> {shipment.destination}
              </p>
              <p className="text-sm text-gray-500 flex items-center">
                <TruckIcon className="h-4 w-4 mr-1" />
                <span className="font-medium mr-2">Carrier:</span> {shipment.carrier || 'Zimbabwe Shipping'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center mb-2">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="font-medium mr-2">Shipped on:</span> {formatDate(shipment.created_at)}
              </p>
              <p className="text-sm text-gray-500 flex items-center mb-2">
                <Clock className="h-4 w-4 mr-1" />
                <span className="font-medium mr-2">Estimated delivery:</span> {formatDate(shipment.estimated_delivery)}
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm">
              Track
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const EmptyState = ({ message = "No shipments found" }) => (
  <div className="text-center p-12 text-gray-500">
    <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
    <p className="mb-2">{message}</p>
    <p className="text-sm">Start shipping to see your activity here.</p>
  </div>
);

export default Dashboard;
