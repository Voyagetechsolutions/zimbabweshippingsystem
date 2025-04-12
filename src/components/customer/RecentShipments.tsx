
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  created_at: string;
  origin: string;
  destination: string;
  estimated_delivery: string | null;
}

const getStatusBadgeClass = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (true) {
    case statusLower.includes('confirmed'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('ready'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('processing'):
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case statusLower.includes('customs'):
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('out for delivery'):
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case statusLower.includes('delivered'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('cancelled'):
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function RecentShipments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShipments = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('shipments')
          .select('id, tracking_number, status, created_at, origin, destination, estimated_delivery')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error('Error fetching shipments:', error);
        } else {
          setShipments(data || []);
        }
      } catch (error) {
        console.error('Error in fetchShipments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipments();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Shipments</CardTitle>
        <CardDescription>Your recent shipping activities</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <h3 className="text-lg font-medium mb-1">No shipments yet</h3>
            <p className="text-gray-500 mb-4">You haven't made any shipments yet</p>
            <Button 
              onClick={() => navigate('/book-shipment')}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              Book Your First Shipment
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-mono text-xs sm:text-sm">{shipment.tracking_number}</TableCell>
                    <TableCell className="max-w-[80px] truncate text-xs sm:text-sm">{shipment.origin}</TableCell>
                    <TableCell className="max-w-[80px] truncate text-xs sm:text-sm">{shipment.destination}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(shipment.status)}>
                        {shipment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/shipment/${shipment.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {shipments.length > 0 && (
        <CardFooter>
          <Button variant="outline" onClick={() => navigate('/shipments')} className="w-full">
            View All Shipments
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
