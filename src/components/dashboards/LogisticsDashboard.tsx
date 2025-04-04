
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, AlertTriangle, CheckCircle } from 'lucide-react';

const LogisticsDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Awaiting Pickup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-amber-500 mr-3" />
              <div className="text-2xl font-bold">12</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">24</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Delivered Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">8</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Delayed Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div className="text-2xl font-bold">3</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="shipments" className="mb-8">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 gap-2">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Assign Driver</span>
          </TabsTrigger>
          <TabsTrigger value="delays" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Delays</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>Completed</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Management</CardTitle>
              <CardDescription>View and manage all active shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Shipment management table will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Driver Assignment</CardTitle>
              <CardDescription>Assign drivers to shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Driver assignment interface will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="delays">
          <Card>
            <CardHeader>
              <CardTitle>Delayed Shipments</CardTitle>
              <CardDescription>Manage shipments that are delayed</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Delayed shipments management will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Shipments</CardTitle>
              <CardDescription>View history of completed shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Completed shipments history will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogisticsDashboard;
