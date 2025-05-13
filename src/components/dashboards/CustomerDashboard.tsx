
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecentShipments } from '@/components/customer/RecentShipments';
import PaymentHistorySection from '@/components/PaymentHistorySection';
import CustomQuotesTab from './CustomQuotesTab';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('shipments');
  const { user } = useAuth();
  
  return (
    <div className="container px-4 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}</h1>
        <p className="text-muted-foreground">Manage your shipments and view your account information</p>
      </div>
      
      <Tabs defaultValue="shipments" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full border-b pb-0 mb-6">
          <TabsTrigger value="shipments" className="flex-1 sm:flex-none">Shipments</TabsTrigger>
          <TabsTrigger value="custom-quotes" className="flex-1 sm:flex-none">Custom Quotes</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments">
          <RecentShipments />
        </TabsContent>
        
        <TabsContent value="custom-quotes">
          <CustomQuotesTab />
        </TabsContent>
        
        <TabsContent value="payments">
          <Card>
            <CardContent className="pt-6">
              <PaymentHistorySection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDashboard;
