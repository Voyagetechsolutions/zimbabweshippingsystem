
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';
import { useRole } from '@/contexts/RoleContext';
import { SetupAdmin } from '@/components/SetupAdmin';

const AdminDashboard = () => {
  const { hasPermission } = useRole();
  const isAdmin = hasPermission('admin');
  
  // Use effect to ensure permissions are properly loaded
  useEffect(() => {
    document.title = 'Admin Dashboard | UK to Zimbabwe Shipping';
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          {isAdmin ? (
            <AdminDashboardContent />
          ) : (
            <div className="max-w-md mx-auto">
              <SetupAdmin />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
