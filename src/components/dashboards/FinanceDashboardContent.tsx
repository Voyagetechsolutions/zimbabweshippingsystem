import React, { Suspense, lazy, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CreditCard, FileText, Loader2, Package, Users, Wallet } from 'lucide-react';
import StaffDashboardShell, { type ShellNavGroup } from './StaffDashboardShell';
import FinanceOverview from './FinanceOverview';

// The finance dashboard.
//
// Finance staff share the admin dashboard's finance tabs, and now its shipment
// list too: invoices are not raised automatically, so finance has to be able to
// open a booking and raise one. Withholding shipments meant the people
// responsible for billing could not see the thing being billed.
//
// Staff administration and content stay out — the same split the staff app
// makes, and the same split `is_finance_staff()` enforces server-side, which
// already grants finance read access to shipments.
//
// The heavy tabs are lazy so a finance user does not download the whole admin
// bundle to look at their cash position.

const InvoicesTab = lazy(() => import('@/components/admin/tabs/InvoicesTab'));
const PaymentsInvoicingTab = lazy(() => import('@/components/admin/tabs/PaymentsInvoicingTab'));
const PaymentScheduleManagement = lazy(() => import('@/components/admin/PaymentScheduleManagement'));
const ReportsAnalyticsTab = lazy(() => import('@/components/admin/tabs/ReportsAnalyticsTab'));
const ShipmentManagementTab = lazy(() => import('@/components/admin/tabs/ShipmentManagementTab'));
const OperationsReport = lazy(() => import('@/components/reports/OperationsReport'));
const CustomerAccounts = lazy(() => import('@/components/reports/CustomerAccounts'));

function TabFallback() {
  return (
    <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

export default function FinanceDashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');

  const navGroups: ShellNavGroup[] = useMemo(() => [
    {
      key: 'position',
      label: 'Position',
      items: [{ value: 'overview', label: 'Overview', icon: Wallet }],
    },
    {
      key: 'money',
      label: 'Money',
      items: [
        { value: 'invoices', label: 'Invoices', icon: FileText },
        { value: 'payments', label: 'Payments', icon: CreditCard },
        { value: 'paymentSchedule', label: '30-Day Payments', icon: CalendarDays },
      ],
    },
    {
      key: 'work',
      label: 'Work',
      // Invoices are raised by hand from a booking, so finance needs the
      // bookings in front of them.
      items: [{ value: 'shipments', label: 'Shipments', icon: Package }],
    },
    {
      key: 'insight',
      label: 'Insight',
      items: [
        { value: 'reports', label: 'Reports', icon: BarChart3 },
        { value: 'operationsReport', label: 'Revenue Reports', icon: BarChart3 },
        { value: 'customerAccounts', label: 'Customer Accounts', icon: Users },
      ],
    },
  ], []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <FinanceOverview onNavigate={setActiveTab} />;
      case 'invoices': return <Suspense fallback={<TabFallback />}><InvoicesTab /></Suspense>;
      case 'payments': return <Suspense fallback={<TabFallback />}><PaymentsInvoicingTab /></Suspense>;
      case 'paymentSchedule': return <Suspense fallback={<TabFallback />}><PaymentScheduleManagement /></Suspense>;
      case 'shipments': return <Suspense fallback={<TabFallback />}><ShipmentManagementTab /></Suspense>;
      case 'reports': return <Suspense fallback={<TabFallback />}><ReportsAnalyticsTab /></Suspense>;
      case 'operationsReport': return <Suspense fallback={<TabFallback />}><OperationsReport title="Revenue reports" /></Suspense>;
      case 'customerAccounts': return <Suspense fallback={<TabFallback />}><CustomerAccounts /></Suspense>;
      default: return null;
    }
  };

  return (
    <StaffDashboardShell
      brandTitle="Finance"
      brandSubtitle="Zimbabwe Shipping"
      brandIcon={Wallet}
      navGroups={navGroups}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {renderTab()}
    </StaffDashboardShell>
  );
}
