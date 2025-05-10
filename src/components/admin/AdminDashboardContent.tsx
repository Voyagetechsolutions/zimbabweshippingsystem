import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import NotificationsAlertsTab from '@/components/admin/tabs/NotificationsAlertsTab';
import ShipmentManagementTab from '@/components/admin/tabs/ShipmentManagementTab';
import PaymentsInvoicingTab from '@/components/admin/tabs/PaymentsInvoicingTab';
import DeliveryManagementTab from '@/components/admin/tabs/DeliveryManagementTab';
import AnalyticsReportingTab from '@/components/admin/tabs/AnalyticsReportingTab';
import UserManagementTab from '@/components/admin/tabs/UserManagementTab';
import SystemSettingsTab from '@/components/admin/tabs/SystemSettingsTab';

const AdminDashboardContent = () => {
  return (
    <Tabs defaultValue="shipments" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="shipments">Shipment Management</TabsTrigger>
        <TabsTrigger value="deliveries">Delivery Management</TabsTrigger>
        <TabsTrigger value="payments">Payments & Invoicing</TabsTrigger>
        <TabsTrigger value="notifications">Notifications & Alerts</TabsTrigger>
        <TabsTrigger value="analytics">Analytics & Reporting</TabsTrigger>
        <TabsTrigger value="users">User Management</TabsTrigger>
        <TabsTrigger value="settings">System Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="shipments">
        <ShipmentManagementTab />
      </TabsContent>
      <TabsContent value="deliveries">
        <DeliveryManagementTab />
      </TabsContent>
      <TabsContent value="payments">
        <PaymentsInvoicingTab />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationsAlertsTab />
      </TabsContent>
      <TabsContent value="analytics">
        <AnalyticsReportingTab />
      </TabsContent>
      <TabsContent value="users">
        <UserManagementTab />
      </TabsContent>
      <TabsContent value="settings">
        <SystemSettingsTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminDashboardContent;
