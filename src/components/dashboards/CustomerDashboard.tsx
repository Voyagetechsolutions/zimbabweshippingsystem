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
import CustomQuotesTab from '@/components/customer/CustomQuotesTab';

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
  FileText
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
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome back! Here you can see your shipments, receipts and manage your account.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>My Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4" />
            <span>My Receipts</span>
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Custom Quotes</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Saved Addresses</span>
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

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Receipts</CardTitle>
              <CardDescription>View and download payment receipts</CardDescription>
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
                  title="No Receipts Yet"
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

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Quotes</CardTitle>
              <CardDescription>View and manage your custom shipping quote requests</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomQuotesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Addresses</CardTitle>
              <CardDescription>Manage your saved addresses for faster checkout</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAddresses ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : addresses && addresses.length > 0 ? (
                <div className="space-y-4">
                  {addresses.map((address: any) => (
                    <div key={address.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{address.address_name}</h4>
                        {address.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <p className="text-sm">{address.recipient_name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <p className="text-sm">{address.phone_number || 'No phone provided'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                            <p className="text-sm">
                              {address.street_address}, {address.city}
                              {address.state && `, ${address.state}`}
                              {address.postal_code && ` ${address.postal_code}`}, 
                              {address.country}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end space-x-2">
                        <Link to={`/address-book?edit=${address.id}`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<MapPin className="h-12 w-12 text-gray-400" />}
                  title="No Saved Addresses"
                  description="Add addresses to your address book for faster checkout"
                  action={
                    <Link to="/address-book">
                      <Button>Add Address</Button>
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDashboard;
