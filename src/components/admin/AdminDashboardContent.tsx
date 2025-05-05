
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CSVLink } from 'react-csv';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, Package, BarChart, User, File } from 'lucide-react';
import { format } from 'date-fns';
import { tableFrom } from '@/integrations/supabase/db-types';
import { castToShipments } from '@/utils/shipmentUtils';

const AdminDashboardContent: React.FC = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalShipments, setTotalShipments] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [shipmentsCsv, setShipmentsCsv] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch total shipments count
        const { count: shipmentsCount, error: shipmentsError } = await supabase
          .from(tableFrom('shipments'))
          .select('*', { count: 'exact' });
        
        if (shipmentsError) throw shipmentsError;
        setTotalShipments(shipmentsCount || 0);
        
        // Fetch total users count
        const { count: usersCount, error: usersError } = await supabase
          .from(tableFrom('profiles'))
          .select('*', { count: 'exact' });
        
        if (usersError) throw usersError;
        setTotalUsers(usersCount || 0);
      } catch (error: any) {
        console.error('Error fetching dashboard counts:', error);
        setError('Failed to fetch dashboard counts');
      }
    };
    
    const fetchRecentShipments = async () => {
      try {
        const { data, error } = await supabase
          .from(tableFrom('shipments'))
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        if (data) {
          // Convert to Shipment[] with metadata extracted
          const shipmentData = castToShipments(data);
          setShipments(shipmentData);
        }
      } catch (error) {
        console.error('Error fetching recent shipments:', error);
        setError('Failed to fetch recent shipments');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
    fetchRecentShipments();
  }, []);
  
  // Update exportShipments function to use the async/await properly
  const exportShipments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from(tableFrom('shipments'))
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const shipmentData = castToShipments(data);
        // Then use the shipmentData array for your export logic
        const shipmentsCsv = shipmentData.map(shipment => ({
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          origin: shipment.origin,
          destination: shipment.destination,
          status: shipment.status,
          created_at: shipment.created_at,
          updated_at: shipment.updated_at,
          user_id: shipment.user_id,
          carrier: shipment.carrier,
          weight: shipment.weight,
          dimensions: shipment.dimensions,
          estimated_delivery: shipment.estimated_delivery,
        }));
        
        setShipmentsCsv(shipmentsCsv);
      }
    } catch (error) {
      console.error('Error exporting shipments:', error);
      setError('Failed to export shipments');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Shipments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
          <Package className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? <Skeleton className="w-20 h-8" /> : totalShipments}</div>
          <p className="text-sm text-gray-500">All time shipments</p>
        </CardContent>
      </Card>
      
      {/* Total Users Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <User className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? <Skeleton className="w-20 h-8" /> : totalUsers}</div>
          <p className="text-sm text-gray-500">Registered users</p>
        </CardContent>
      </Card>
      
      {/* Recent Shipments Card */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
          <CardDescription>Latest shipment activity</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && <p className="text-red-500">{error}</p>}
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : shipments.length > 0 ? (
            <div className="grid gap-2">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="border rounded-md p-4">
                  <div className="font-medium">{shipment.tracking_number}</div>
                  <div className="text-sm text-gray-500">
                    {shipment.origin} to {shipment.destination}
                  </div>
                  <div className="text-sm text-gray-500">
                    Status: {shipment.status}
                  </div>
                  <div className="text-sm text-gray-500">
                    Created at: {format(new Date(shipment.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">No recent shipments</div>
          )}
        </CardContent>
      </Card>
      
      {/* Export Shipments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Export Shipments</CardTitle>
          <File className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <Button onClick={exportShipments} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Export to CSV
              </>
            )}
          </Button>
          {shipmentsCsv.length > 0 && (
            <CSVLink data={shipmentsCsv} filename={"shipments.csv"} className="text-sm text-gray-500 mt-2 block">
              Download CSV
            </CSVLink>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardContent;
