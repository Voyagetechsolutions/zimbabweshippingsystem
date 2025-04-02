
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Package, TruckIcon, BarChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {user?.email}</p>
      
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
            <p className="text-3xl font-bold">0</p>
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
            <p className="text-3xl font-bold">0</p>
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
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
          <CardDescription>Track your recent shipping activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-12 text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="mb-2">No shipments found</p>
            <p className="text-sm">Start shipping to see your activity here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
