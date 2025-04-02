
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Search,
  X,
  AlertTriangle,
  ChevronLeft, 
  ChevronRight,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Define shipment type based on database structure
type Shipment = {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  user_id: string;
  carrier: string | null;
  weight: number | null;
  dimensions: string | null;
  created_at: string;
  updated_at: string;
  estimated_delivery: string | null;
  user_email?: string;
  user_name?: string;
};

// Define status options
const statusOptions = [
  { value: "Processing", label: "Processing" },
  { value: "In Transit", label: "In Transit" },
  { value: "Out for Delivery", label: "Out for Delivery" },
  { value: "Delivered", label: "Delivered" },
  { value: "Delayed", label: "Delayed" },
  { value: "On Hold", label: "On Hold" }
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Check if user is admin (for demo purposes, you can use a specific email or check a roles table)
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      // In a real application, you would check against a roles table
      // For this demo, we'll assume an admin email
      setIsAdmin(true); // For demo, all authenticated users are admins

      if (isAdmin) {
        fetchShipments();
      } else {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [user, isAdmin]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      
      // Fetch shipments with user profiles
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const formattedShipments: Shipment[] = data.map((shipment: any) => ({
          ...shipment,
          user_email: shipment.profiles?.email,
          user_name: shipment.profiles?.full_name,
        }));
        
        setShipments(formattedShipments);
        applyFilters(formattedShipments, searchTerm, statusFilter);
      }
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: "Error",
        description: "Failed to load shipments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (
    shipments: Shipment[], 
    search: string, 
    status: string
  ) => {
    let results = [...shipments];
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      results = results.filter(
        shipment => 
          shipment.tracking_number.toLowerCase().includes(lowerSearch) ||
          shipment.origin.toLowerCase().includes(lowerSearch) ||
          shipment.destination.toLowerCase().includes(lowerSearch) ||
          (shipment.user_email && shipment.user_email.toLowerCase().includes(lowerSearch)) ||
          (shipment.user_name && shipment.user_name.toLowerCase().includes(lowerSearch))
      );
    }
    
    if (status) {
      results = results.filter(shipment => shipment.status === status);
    }
    
    setFilteredShipments(results);
    setTotalPages(Math.ceil(results.length / itemsPerPage));
    setPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    applyFilters(shipments, searchValue, statusFilter);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    applyFilters(shipments, searchTerm, value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    applyFilters(shipments, '', '');
  };

  const updateShipmentStatus = async (id: string, status: string) => {
    try {
      setUpdatingStatus(id);
      
      const { error } = await supabase
        .from('shipments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state to reflect the change
      const updatedShipments = shipments.map(shipment => 
        shipment.id === id ? { ...shipment, status, updated_at: new Date().toISOString() } : shipment
      );
      
      setShipments(updatedShipments);
      applyFilters(updatedShipments, searchTerm, statusFilter);
      
      toast({
        title: "Status Updated",
        description: `Shipment status updated to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update shipment status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Get current page items
  const currentShipments = filteredShipments.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      "Processing": "bg-blue-100 text-blue-800",
      "In Transit": "bg-yellow-100 text-yellow-800",
      "Delivered": "bg-green-100 text-green-800",
      "Delayed": "bg-red-100 text-red-800",
      "Out for Delivery": "bg-purple-100 text-purple-800",
      "On Hold": "bg-gray-100 text-gray-800"
    };
    
    return (
      <Badge className={`font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </Badge>
    );
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-500 text-center mb-6">
              You do not have permission to access the admin dashboard.
            </p>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-zim-green/10 p-3 rounded-full">
                <Package className="h-6 w-6 text-zim-green" />
              </div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            
            <Button 
              onClick={fetchShipments}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search by tracking #, origin, destination or customer..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 w-full"
              />
              {searchTerm && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setSearchTerm('');
                    applyFilters(shipments, '', statusFilter);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="md:w-64">
              <Select 
                value={statusFilter} 
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(searchTerm || statusFilter) && (
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="md:w-auto w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No shipments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter 
                  ? "Try adjusting your search or filters"
                  : "No shipments have been created yet"}
              </p>
            </div>
          ) : (
            <div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead className="hidden md:table-cell">Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Origin</TableHead>
                      <TableHead className="hidden md:table-cell">Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">
                          {shipment.tracking_number}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            {shipment.user_name || "Unknown"}
                            {shipment.user_email && (
                              <div className="text-xs text-gray-500">
                                {shipment.user_email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{shipment.origin}</TableCell>
                        <TableCell className="hidden md:table-cell">{shipment.destination}</TableCell>
                        <TableCell>{renderStatusBadge(shipment.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(shipment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={shipment.status} 
                            onValueChange={(value) => updateShipmentStatus(shipment.id, value)}
                            disabled={updatingStatus === shipment.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              {updatingStatus === shipment.id ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Updating...
                                </div>
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredShipments.length)} of {filteredShipments.length} shipments
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setPage(page => Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                      Page {page} of {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setPage(page => Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
