
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CustomerDashboard from '@/components/dashboards/CustomerDashboard';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';
import DriverDashboard from '@/components/dashboards/DriverDashboard';
import LogisticsDashboard from '@/components/dashboards/LogisticsDashboard';
import SupportDashboard from '@/components/dashboards/SupportDashboard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, loading, isAdmin } = useAuth();
  const role = user?.user_metadata?.role || 'customer';

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

  // Show the appropriate dashboard based on user role
  const getDashboardComponent = () => {
    if (isAdmin) {
      return <AdminDashboardContent />;
    }

    switch (role) {
      case 'driver':
        return <DriverDashboard />;
      case 'logistics':
        return <LogisticsDashboard />;
      case 'support':
        return <SupportDashboard />;
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <>
      <Navbar />
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {getDashboardComponent()}
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;
