
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Camera, RefreshCw, Clock, Navigation, Check, 
  AlertTriangle, ArrowRight, Truck 
} from 'lucide-react';

const DriverDashboard = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="mr-2 h-5 w-5 text-zim-green" />
            Today's Deliveries
          </CardTitle>
          <CardDescription>Your assigned deliveries for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <div className="font-bold text-2xl text-amber-600">3</div>
              <div className="text-amber-600 text-sm">Pending Pickups</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="font-bold text-2xl text-blue-600">5</div>
              <div className="text-blue-600 text-sm">Pending Deliveries</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-green-600" />
                <div className="font-bold text-green-600">2:30 PM</div>
              </div>
              <div className="text-green-600 text-sm">Est. Completion</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assigned Shipments</h3>
            
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">Pickup: John Smith</h4>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      123 Main St, London
                    </div>
                    <div className="mt-2">
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pickup</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-500">Tracking: ABC123</span>
                    <Button size="sm" variant="outline" className="mt-2">
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-5 gap-2">
                  <Button variant="outline" className="col-span-5 md:col-span-1">
                    <Camera className="h-4 w-4 mr-1 md:mr-0" />
                    <span className="md:hidden">Photo</span>
                  </Button>
                  <Button className="bg-amber-500 hover:bg-amber-600 col-span-5 md:col-span-4">
                    <Check className="h-4 w-4 mr-1" />
                    Mark as Picked Up
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">Delivery: Sarah Johnson</h4>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      456 Park Avenue, Manchester
                    </div>
                    <div className="mt-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Out for Delivery</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-500">Tracking: DEF456</span>
                    <Button size="sm" variant="outline" className="mt-2">
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-5 gap-2">
                  <Button variant="outline" className="col-span-5 md:col-span-1">
                    <Camera className="h-4 w-4 mr-1 md:mr-0" />
                    <span className="md:hidden">Photo</span>
                  </Button>
                  <Button className="bg-green-500 hover:bg-green-600 col-span-5 md:col-span-3">
                    <Check className="h-4 w-4 mr-1" />
                    Mark as Delivered
                  </Button>
                  <Button variant="secondary" className="col-span-5 md:col-span-1">
                    <AlertTriangle className="h-4 w-4 mr-1 md:mr-0" />
                    <span className="md:hidden">Issue</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center">
              <Button variant="outline" className="w-full md:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Shipments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Delivery Navigation</CardTitle>
          <CardDescription>Optimized route for today's deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <Navigation className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Map will be displayed here</p>
              <Button className="mt-4 bg-zim-green hover:bg-zim-green/90">
                <ArrowRight className="h-4 w-4 mr-2" />
                Start Navigation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDashboard;
