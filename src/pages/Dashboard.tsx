
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole, UserRole } from '@/contexts/RoleContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

// Role-specific dashboards
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import LogisticsDashboard from '@/components/dashboards/LogisticsDashboard';
import DriverDashboard from '@/components/dashboards/DriverDashboard';
import SupportDashboard from '@/components/dashboards/SupportDashboard';
import CustomerDashboard from '@/components/dashboards/CustomerDashboard';

// Show role elevation dialog for testing
import RoleElevationDialog from '@/components/RoleElevationDialog';

const Dashboard = () => {
  const { user } = useAuth();
  const { role, isLoading, hasPermission } = useRole();
  const navigate = useNavigate();
  
  console.log('Dashboard - User:', user?.id, 'Role:', role, 'isAdmin:', hasPermission('admin'));
  
  useEffect(() => {
    if (user && !isLoading && !role) {
      // If no role is assigned, default to customer
      console.log('No role assigned, defaulting to customer');
    }
  }, [user, role, isLoading]);
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  // Render the appropriate dashboard based on user role
  const renderDashboard = () => {
    switch (role) {
      case 'admin':
        return <AdminDashboard />;
      case 'logistics':
        return <LogisticsDashboard />;
      case 'driver':
        return <DriverDashboard />;
      case 'support':
        return <SupportDashboard />;
      case 'customer':
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {role === 'admin' ? 'Admin Dashboard' :
               role === 'logistics' ? 'Logistics Dashboard' :
               role === 'driver' ? 'Driver Dashboard' :
               role === 'support' ? 'Support Dashboard' :
               'My Dashboard'}
            </h1>
            <p className="text-gray-500 text-sm md:text-base">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          
          {/* Role elevation dialog for testing purposes */}
          <div className="self-start md:self-auto">
            <RoleElevationDialog />
          </div>
        </div>
        
        {renderDashboard()}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Dashboard;
