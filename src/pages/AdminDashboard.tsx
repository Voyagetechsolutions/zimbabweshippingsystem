
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { SetupAdmin } from '@/components/SetupAdmin';
import CustomQuoteManagement from '@/components/admin/CustomQuoteManagement';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { hasPermission } = useRole();
  const isAdmin = hasPermission('admin');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Redirect non-admin users away from admin dashboard
    if (!isAdmin && user) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive",
      });
      navigate('/');
    }
    
    // Redirect unauthenticated users to login
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the admin dashboard.",
        variant: "destructive",
      });
      navigate('/auth', { state: { returnUrl: '/admin' } });
    }
  }, [user, isAdmin, navigate, toast]);
  
  // Show nothing while redirecting
  if (!user || !isAdmin) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          {isAdmin ? (
            <>
              <AdminDashboardContent />
              <div className="mt-8">
                <CustomQuoteManagement />
              </div>
            </>
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
