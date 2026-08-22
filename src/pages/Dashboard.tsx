
import React, { Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffRole } from '@/hooks/useStaffRole';
import CustomerDashboard from '@/components/dashboards/CustomerDashboard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// Each staff dashboard is its own chunk. Admin is by far the largest, so a
// driver on depot wifi should never have to download it to see their route.
const AdminDashboardContent = lazy(() => import('@/components/admin/AdminDashboardContent'));
const FinanceDashboardContent = lazy(() => import('@/components/dashboards/FinanceDashboardContent'));
const DriverDashboardContent = lazy(() => import('@/components/dashboards/DriverDashboardContent'));

function DashboardSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { staffRole, loading: roleLoading } = useStaffRole();

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-6 text-gray-600">
              Please sign in or create an account to view your dashboard.
            </p>
            <Link to="/auth">
              <Button>Sign In / Sign Up</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Staff dashboards are full-viewport with their own chrome — skip the public
  // Navbar/Footer. Wait for the role before choosing, so a finance or driver
  // account never flashes the customer dashboard on the way in.
  if (roleLoading) return <DashboardSpinner label="Loading your dashboard..." />;
  if (staffRole === 'admin') {
    return (
      <Suspense fallback={<DashboardSpinner label="Loading the admin dashboard..." />}>
        <AdminDashboardContent />
      </Suspense>
    );
  }
  if (staffRole === 'finance') {
    return (
      <Suspense fallback={<DashboardSpinner label="Loading the finance dashboard..." />}>
        <FinanceDashboardContent />
      </Suspense>
    );
  }
  if (staffRole === 'driver') {
    return (
      <Suspense fallback={<DashboardSpinner label="Loading your driver dashboard..." />}>
        <DriverDashboardContent />
      </Suspense>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <CustomerDashboard />
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;
