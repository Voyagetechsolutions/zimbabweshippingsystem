
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export const RecentShipments = () => {
  const { user } = useAuth();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['recentShipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shipments || shipments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No recent shipments found.</p>
          <Button asChild className="mt-4 w-full">
            <Link to="/book-shipment">Book a Shipment</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{status}</Badge>;
      case 'in transit':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{status}</Badge>;
      case 'delayed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Shipments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shipments.map((shipment) => (
            <div key={shipment.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{shipment.tracking_number}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(shipment.status)}
                  <span className="text-xs text-gray-500">
                    {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link to={`/shipment/${shipment.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" className="w-full mt-4">
          <Link to="/dashboard">View All Shipments</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
