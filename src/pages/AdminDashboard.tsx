
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';
import { useAuth } from '@/contexts/AuthContext'; 
import { SetupAdmin } from '@/components/SetupAdmin';

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth(); // Use isAdmin directly from AuthContext
  
  // Use effect to ensure permissions are properly loaded
  useEffect(() => {
    document.title = 'Admin Dashboard | UK to Zimbabwe Shipping';
  }, []);
  
  // Show loading indicator while checking admin status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }
  
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
