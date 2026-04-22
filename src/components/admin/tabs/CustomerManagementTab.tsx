
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TabHeader from '../TabHeader';

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  Search,
  RefreshCcw,
  Eye,
  User,
  Package,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';

// Types
interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  bookingCount: number;
  bookings: ShipmentData[];
}

interface ShipmentData {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  metadata: any;
}

const CustomerManagementTab = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    fetchCustomersWithBookings();
  }, []);

  const fetchCustomersWithBookings = async () => {
    setLoading(true);
    try {
      // Fetch all shipments
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Group shipments by customer (using email as primary identifier, phone as secondary)
      const customerMap = new Map<string, CustomerData>();

      (shipments || []).forEach((shipment: any) => {
        const metadata = shipment.metadata || {};

        // Extract sender details from various metadata structures
        const senderName = getSenderName(metadata);
        const senderEmail = getSenderEmail(metadata);
        const senderPhone = getSenderPhone(metadata);

        // Use email as primary key, fallback to phone if no email
        const customerKey = senderEmail && senderEmail !== 'No Email'
          ? senderEmail.toLowerCase()
          : senderPhone && senderPhone !== 'No Phone'
            ? senderPhone
            : null;

        if (!customerKey) return; // Skip if no identifier

        if (customerMap.has(customerKey)) {
          const existing = customerMap.get(customerKey)!;
          existing.bookingCount++;
          existing.bookings.push({
            id: shipment.id,
            tracking_number: shipment.tracking_number,
            origin: shipment.origin,
            destination: shipment.destination,
            status: shipment.status,
            created_at: shipment.created_at,
            metadata: metadata
          });
          // Update name/phone if current is empty
          if (!existing.full_name || existing.full_name === 'Unknown') {
            existing.full_name = senderName;
          }
          if (!existing.phone || existing.phone === 'N/A') {
            existing.phone = senderPhone;
          }
        } else {
          customerMap.set(customerKey, {
            id: customerKey,
            full_name: senderName,
            email: senderEmail,
            phone: senderPhone,
            bookingCount: 1,
            bookings: [{
              id: shipment.id,
              tracking_number: shipment.tracking_number,
              origin: shipment.origin,
              destination: shipment.destination,
              status: shipment.status,
              created_at: shipment.created_at,
              metadata: metadata
            }]
          });
        }
      });

      // Convert map to array and sort by booking count
      const customersArray = Array.from(customerMap.values())
        .sort((a, b) => b.bookingCount - a.bookingCount);

      setCustomers(customersArray);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to extract sender details from metadata
  const getSenderName = (metadata: any): string => {
    if (metadata.sender?.name) return metadata.sender.name;
    if (metadata.sender?.firstName && metadata.sender.lastName) {
      return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
    }
    if (metadata.senderDetails?.firstName && metadata.senderDetails.lastName) {
      return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
    }
    if (metadata.senderDetails?.name) return metadata.senderDetails.name;
    if (metadata.firstName && metadata.lastName) return `${metadata.firstName} ${metadata.lastName}`;
    if (metadata.sender_name) return metadata.sender_name;
    if (metadata.sender_details?.name) return metadata.sender_details.name;
    return 'Unknown';
  };

  const getSenderEmail = (metadata: any): string => {
    return metadata.sender?.email ||
      metadata.senderDetails?.email ||
      metadata.email ||
      metadata.sender_email ||
      'No Email';
  };

  const getSenderPhone = (metadata: any): string => {
    return metadata.sender?.phone ||
      metadata.senderDetails?.phone ||
      metadata.phone ||
      metadata.sender_phone ||
      metadata.sender_details?.phone ||
      'N/A';
  };

  const getRecipientName = (metadata: any): string => {
    return metadata.recipient?.name ||
      metadata.recipientDetails?.name ||
      metadata.recipientName ||
      metadata.receiver_name ||
      'Unknown';
  };

  const getRecipientPhone = (metadata: any): string => {
    return metadata.recipient?.phone ||
      metadata.recipientDetails?.phone ||
      metadata.recipientPhone ||
      metadata.receiver_phone ||
      'N/A';
  };

  const getRecipientCity = (metadata: any): string => {
    return metadata.recipient?.city ||
      metadata.recipientDetails?.city ||
      metadata.recipientCity ||
      '';
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      searchQuery === '' ||
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchQuery)
    );
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <TabHeader
        title="Customer Management"
        description="View and manage all customers and their bookings"
        actions={
          <Button variant="outline" size="sm" onClick={fetchCustomersWithBookings}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Search Controls */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No customers found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'No bookings have been made yet'}
            </p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.full_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {customer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={customer.bookingCount >= 5 ? "default" : "outline"}
                          className={customer.bookingCount >= 5 ? "bg-green-600" : ""}
                        >
                          {customer.bookingCount}
                        </Badge>
                        {customer.bookingCount >= 10 && (
                          <Badge variant="secondary" className="ml-2 text-xs">VIP</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingCustomer(customer)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Customer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>

      {/* View Customer Details Dialog */}
      {viewingCustomer && (
        <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
          <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </DialogTitle>
              <DialogDescription>
                View customer information and booking history
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Customer Info Card */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                    <p className="font-medium">{viewingCustomer.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p>{viewingCustomer.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{viewingCustomer.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Badge variant="outline" className="text-sm">
                    <Package className="h-3 w-3 mr-1" />
                    {viewingCustomer.bookingCount} Total Booking{viewingCustomer.bookingCount !== 1 ? 's' : ''}
                  </Badge>
                  {viewingCustomer.bookingCount >= 10 && (
                    <Badge variant="secondary" className="ml-2">VIP Customer</Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Bookings List */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Booking History
                </h3>

                {viewingCustomer.bookings.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewingCustomer.bookings.map(booking => (
                      <div
                        key={booking.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">
                                {booking.tracking_number}
                              </span>
                              <Badge variant={getStatusBadgeVariant(booking.status)}>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(booking.created_at), 'dd MMM yyyy')}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-green-600" />
                              <span className="text-muted-foreground">From:</span>
                              <span>{booking.origin}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-red-600" />
                              <span className="text-muted-foreground">To:</span>
                              <span>{booking.destination}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recipient Info */}
                        <div className="mt-3 pt-3 border-t text-sm">
                          <span className="text-muted-foreground">Recipient:</span>{' '}
                          <span className="font-medium">{getRecipientName(booking.metadata)}</span>
                          {getRecipientPhone(booking.metadata) !== 'N/A' && (
                            <span className="text-muted-foreground ml-2">
                              ({getRecipientPhone(booking.metadata)})
                            </span>
                          )}
                          {getRecipientCity(booking.metadata) && (
                            <span className="text-muted-foreground ml-2">
                              - {getRecipientCity(booking.metadata)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const email = viewingCustomer.email;
                  if (email && email !== 'No Email') {
                    window.location.href = `mailto:${email}`;
                  }
                }}
                disabled={viewingCustomer.email === 'No Email'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Customer
              </Button>
              <Button onClick={() => setViewingCustomer(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomerManagementTab;
