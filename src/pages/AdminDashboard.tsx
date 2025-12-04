
import React, { useEffect } from 'react';
import { ModernAdminDashboard } from '@/components/admin/ModernAdminDashboard';
import { useAuth } from '@/contexts/AuthContext'; 
import { SetupAdmin } from '@/components/SetupAdmin';
import { RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  
  useEffect(() => {
    document.title = 'Admin Dashboard | Zimbabwe Shipping';
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md mx-auto">
          <SetupAdmin />
        </div>
      </div>
    );
  }
  
  return <ModernAdminDashboard />;
};

export default AdminDashboard;
