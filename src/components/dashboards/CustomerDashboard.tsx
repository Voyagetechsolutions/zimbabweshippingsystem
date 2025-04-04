
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Search, Truck, Bell, MessageSquare, 
  Plus, Clock, Calendar, MapPin
} from 'lucide-react';

const CustomerDashboard = () => {
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
          <div className="divide-y">
            <div className="py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">Drum Shipment to London</h4>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                    <span className="text-sm text-gray-500 font-mono">ABC12345678</span>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" /> Manchester to London
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Transit</Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" /> 
                    <span>Booked: Mar 28, 2023</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" /> 
                    <span>Delivery: Apr 2, 2023</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline">
                      <Search className="h-4 w-4 mr-1" />
                      Track
                    </Button>
                    <Button size="sm" variant="outline">
                      <Package className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">Drum Shipment to Birmingham</h4>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                    <span className="text-sm text-gray-500 font-mono">DEF87654321</span>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" /> Leeds to Birmingham
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" /> 
                    <span>Booked: Mar 30, 2023</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" /> 
                    <span>Delivery: Apr 5, 2023</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline">
                      <Search className="h-4 w-4 mr-1" />
                      Track
                    </Button>
                    <Button size="sm" variant="outline">
                      <Package className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">Drum Shipment to Glasgow</h4>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                    <span className="text-sm text-gray-500 font-mono">GHI13579246</span>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" /> London to Glasgow
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Delivered</Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" /> 
                    <span>Booked: Mar 15, 2023</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" /> 
                    <span>Delivered: Mar 20, 2023</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline">
                      <Search className="h-4 w-4 mr-1" />
                      Track
                    </Button>
                    <Button size="sm" variant="outline">
                      <Package className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <Button asChild variant="outline">
              <Link to="/dashboard">View All Shipments</Link>
            </Button>
          </div>
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
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="bg-blue-100 text-blue-600 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">Shipment Status Update</h4>
                <p className="text-sm text-gray-500">Your shipment ABC12345678 is now in transit</p>
                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="bg-green-100 text-green-600 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">Support Response</h4>
                <p className="text-sm text-gray-500">Your support ticket #4523 has been resolved</p>
                <p className="text-xs text-gray-400 mt-1">1 day ago</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="bg-amber-100 text-amber-600 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">New Shipment Created</h4>
                <p className="text-sm text-gray-500">You created a new shipment to Birmingham</p>
                <p className="text-xs text-gray-400 mt-1">3 days ago</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <Button asChild variant="outline">
              <Link to="/notifications">View All Notifications</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
