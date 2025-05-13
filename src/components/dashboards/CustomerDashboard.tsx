import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Shipment } from '@/types/shipment';
import { Receipt } from '@/types/receipt';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import html2pdf from 'html2pdf.js';
import { CustomQuotesList } from '@/components/customer/CustomQuotesList';

import { 
  PackageCheck, 
  Receipt as ReceiptIcon, 
  Download, 
  ChevronRight,
  Package,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  Bell,
  FileBox,
  Settings
} from 'lucide-react';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('shipments');

  // Fetch user's shipments
  const fetchShipments = async () => {
    if (!user) return [];
    
    try {
      console.log('Fetching shipments for user ID:', user.id);
      
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching shipments:', error);
        throw error;
      }
      
      console.log('Fetched shipments:', data);
      return data as Shipment[] || [];
    } catch (error) {
      console.error('Error in fetchShipments:', error);
      return [];
    }
  };

  // Fetch user's receipts
  const fetchReceipts = async () => {
    if (!user) return [];
    
    try {
      console.log('Fetching receipts for user ID:', user.id);
      
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching receipts:', error);
        throw error;
      }
      
      console.log('Fetched receipts:', data);
      return data as Receipt[] || [];
    } catch (error) {
      console.error('Error in fetchReceipts:', error);
      return [];
    }
  };

  // Fetch user's saved addresses
  const fetchAddresses = async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
        
      if (error) {
        console.error('Error fetching addresses:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in fetchAddresses:', error);
      return [];
    }
  };

  const { data: shipments, isLoading: isLoadingShipments } = useQuery({
    queryKey: ['customerShipments', user?.id],
    queryFn: fetchShipments,
    enabled: !!user?.id
  });

  const { data: receipts, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['customerReceipts', user?.id],
    queryFn: fetchReceipts,
    enabled: !!user?.id
  });

  const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ['customerAddresses', user?.id],
    queryFn: fetchAddresses,
    enabled: !!user?.id
  });

  // Helper function to generate receipt number
  const getReceiptNumber = (receipt: Receipt) => {
    if (receipt.receipt_number) return receipt.receipt_number;
    
    if (receipt.payment_info && typeof receipt.payment_info === 'object') {
      const paymentInfo = receipt.payment_info as any;
      if (paymentInfo?.receipt_number) return paymentInfo.receipt_number;
    }
    
    return receipt.id.substring(0, 8);
  };

  // Helper function to download receipt as PDF
  const downloadReceipt = (receipt: Receipt) => {
    // Create a receipt template
    const receiptTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 5px;">Zimbabwe Shipping Services</h2>
          <p style="color: #666; margin-top: 0;">Receipt #${getReceiptNumber(receipt)}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Date:</strong> ${formatDate(receipt.created_at)}
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Status:</strong> ${receipt.status || 'Completed'}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Payment Method:</strong> ${receipt.payment_method || 'N/A'}
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Amount:</strong> ${receipt.amount ? formatCurrency(receipt.amount, receipt.currency || 'GBP') : 'N/A'}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Shipment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; width: 50%;">
                <strong>Sender:</strong><br>
                ${receipt.sender_details && typeof receipt.sender_details === 'object' 
                  ? `${(receipt.sender_details as any).name || 'N/A'}<br>
                     ${(receipt.sender_details as any).email || 'N/A'}<br>
                     ${(receipt.sender_details as any).phone || 'N/A'}<br>
                     ${(receipt.sender_details as any).address || 'N/A'}`
                  : 'N/A'}
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; width: 50%;">
                <strong>Recipient:</strong><br>
                ${receipt.recipient_details && typeof receipt.recipient_details === 'object'
                  ? `${(receipt.recipient_details as any).name || 'N/A'}<br>
                     ${(receipt.recipient_details as any).phone || 'N/A'}<br>
                     ${(receipt.recipient_details as any).address || 'N/A'}`
                  : 'N/A'}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Items</h3>
          ${receipt.shipment_details && typeof receipt.shipment_details === 'object'
            ? `<table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee;">Item</th>
                  <th style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">Details</th>
                </tr>
                ${(receipt.shipment_details as any).includeDrums
                  ? `<tr>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">Drums</td>
                      <td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">
                        Quantity: ${(receipt.shipment_details as any).quantity || 'N/A'}
                      </td>
                    </tr>`
                  : ''}
                ${(receipt.shipment_details as any).includeOtherItems
                  ? `<tr>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        ${(receipt.shipment_details as any).category || 'Other Items'}
                      </td>
                      <td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">
                        ${(receipt.shipment_details as any).specificItem || (receipt.shipment_details as any).description || 'N/A'}
                      </td>
                    </tr>`
                  : ''}
              </table>`
            : '<p>No item details available</p>'}
        </div>

        <div style="text-align: center; margin-top: 40px; font-size: 14px; color: #666;">
          <p>Thank you for choosing Zimbabwe Shipping Services.</p>
          <p>For any queries, please contact us at support@zimbabweshipping.com</p>
        </div>
      </div>
    `;

    // Convert HTML to PDF
    const element = document.createElement('div');
    element.innerHTML = receiptTemplate;
    
    const options = {
      margin: 10,
      filename: `receipt-${getReceiptNumber(receipt)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(element).set(options).save();
  };

  // Helper function to display status badge
  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('delivered')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{status}</Badge>;
    } else if (statusLower.includes('cancelled')) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{status}</Badge>;
    } else if (statusLower.includes('booked') || statusLower.includes('booking')) { 
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome back! Here you can see your shipments, receipts and manage your account.
      </p>

      <Tabs defaultValue="shipments" className="mt-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-5">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileBox className="h-4 w-4" />
            <span>Custom Quotes</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Shipments</CardTitle>
              <CardDescription>View and track your current and past shipments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingShipments ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : shipments && shipments.length > 0 ? (
                <div className="space-y-4">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <PackageCheck className="h-5 w-5 text-zim-green" />
                          <h4 className="text-lg font-medium">Tracking #: {shipment.tracking_number}</h4>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <Link to={`/shipment/${shipment.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Origin</p>
                          <p className="text-sm truncate">{shipment.origin}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Destination</p>
                          <p className="text-sm truncate">{shipment.destination}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="text-sm">{formatDate(shipment.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<Package className="h-12 w-12 text-gray-400" />}
                  title="No Shipments Yet"
                  description="Book your first shipment to get started"
                  action={
                    <Link to="/book-shipment">
                      <Button>Book a Shipment</Button>
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Payments</CardTitle>
              <CardDescription>View and manage your payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReceipts ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : receipts && receipts.length > 0 ? (
                <div className="space-y-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <ReceiptIcon className="h-5 w-5 text-zim-green" />
                          <h4 className="text-lg font-medium">Receipt #{getReceiptNumber(receipt)}</h4>
                        </div>
                        <Button 
                          onClick={() => downloadReceipt(receipt)} 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Amount</p>
                          <p className="text-sm">
                            {receipt.amount !== undefined 
                              ? formatCurrency(receipt.amount, receipt.currency || 'GBP') 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Payment Method</p>
                          <p className="text-sm capitalize">{receipt.payment_method || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <p className="text-sm">{receipt.status || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="text-sm">{formatDate(receipt.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<ReceiptIcon className="h-12 w-12 text-gray-400" />}
                  title="No Payments Yet"
                  description="When you make a payment, your receipt will appear here"
                  action={
                    <Link to="/book-shipment">
                      <Button>Book a Shipment</Button>
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>View and manage your notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">New Shipment</h4>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <PackageCheck className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Tracking #: 12345678</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Sender: John Doe</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <p className="text-sm">123 Main St, Anytown, USA</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Payment Received</h4>
                    <Badge variant="outline">Completed</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <ReceiptIcon className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Receipt #12345678</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Recipient: Jane Doe</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <p className="text-sm">456 Elm St, Anytown, USA</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quotes" className="space-y-4">
          <CustomQuotesList />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Profile</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Name: John Doe</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Phone: 123-456-7890</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Email: john.doe@example.com</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <p className="text-sm">123 Main St, Anytown, USA</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Address Book</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Name: Jane Doe</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Phone: 098-765-4321</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Email: jane.doe@example.com</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <p className="text-sm">456 Elm St, Anytown, USA</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Payment Methods</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Card Number: 1234-5678-9012-3456</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <p className="text-sm">Name: John Doe</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <p className="text-sm">123 Main St, Anytown, USA</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDashboard;
