
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, PackageIcon, FilterIcon, CheckCircle, Truck, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  created_at: string;
  estimated_delivery: string | null;
  shipment_type: string;
  origin: string;
  destination: string;
  payment_status: string;
  sender_name?: string;
  recipient_name?: string;
}

const CustomerShipments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("shipments")
          .select(`
            id, 
            tracking_number, 
            status, 
            created_at, 
            estimated_delivery, 
            shipment_type,
            origin,
            destination,
            payment_status,
            sender_details->name as sender_name,
            recipient_details->name as recipient_name
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setShipments(data || []);
        setFilteredShipments(data || []);
      } catch (error: any) {
        console.error("Error fetching shipments:", error);
        toast({
          title: "Error",
          description: "Failed to load shipments. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [navigate, toast]);

  // Update filtered shipments when search or filter changes
  useEffect(() => {
    let result = shipments;

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((shipment) => shipment.status.toLowerCase() === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (shipment) =>
          shipment.tracking_number.toLowerCase().includes(lowerSearchTerm) ||
          shipment.destination.toLowerCase().includes(lowerSearchTerm) ||
          (shipment.recipient_name && shipment.recipient_name.toLowerCase().includes(lowerSearchTerm))
      );
    }

    setFilteredShipments(result);
  }, [searchTerm, statusFilter, shipments]);

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "delivered") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (statusLower === "in transit") {
      return <Truck className="h-5 w-5 text-blue-500" />;
    } else if (statusLower === "processing" || statusLower === "pending") {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "delivered") {
      return "success";
    } else if (statusLower === "in transit") {
      return "default";
    } else if (statusLower === "processing" || statusLower === "pending") {
      return "warning";
    } else {
      return "destructive";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <PackageIcon className="mr-2 h-6 w-6" /> My Shipments
          </h2>
          <Button
            onClick={() => navigate("/book-shipment")}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            Book New Shipment
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by tracking number, destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[180px]">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          // Loading state
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-28" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredShipments.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No shipments found</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "No shipments match your filters. Try adjusting your search."
                : "You haven't made any shipments yet. Click 'Book New Shipment' to get started."}
            </p>
          </div>
        ) : (
          // List of shipments
          <div className="space-y-4">
            {filteredShipments.map((shipment) => (
              <Card key={shipment.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(shipment.status)}
                        {shipment.tracking_number}
                      </CardTitle>
                      <CardDescription>
                        Created on {new Date(shipment.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        getStatusBadgeVariant(shipment.status) as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                          | "success"
                          | "warning"
                      }
                    >
                      {shipment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">Type:</span> {shipment.shipment_type}
                    </div>
                    <div>
                      <span className="font-medium">Destination:</span> {shipment.destination}
                    </div>
                    <div>
                      <span className="font-medium">Recipient:</span>{" "}
                      {shipment.recipient_name || "Not specified"}
                    </div>
                    <div>
                      <span className="font-medium">Est. Delivery:</span>{" "}
                      {shipment.estimated_delivery
                        ? new Date(shipment.estimated_delivery).toLocaleDateString()
                        : "To be determined"}
                    </div>
                    <div>
                      <span className="font-medium">Payment:</span>{" "}
                      {shipment.payment_status === "paid" ? (
                        <span className="text-green-600">Paid</span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/tracking?tracking=${shipment.tracking_number}`)}
                  >
                    Track Shipment
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerShipments;
