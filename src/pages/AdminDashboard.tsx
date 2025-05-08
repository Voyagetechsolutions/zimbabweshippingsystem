
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';
import { useRole } from '@/contexts/RoleContext';
import { SetupAdmin } from '@/components/SetupAdmin';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

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
          <div className="flex items-center mb-6">
            <ShieldCheck className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
          </div>

          {isAdmin ? (
            <AdminDashboardContent />
          ) : (
            <div className="max-w-md mx-auto">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-3">Admin Access Required</h2>
                <p className="text-muted-foreground mb-6">
                  You need admin permissions to access this section. Please use the form below to set up admin access.
                </p>
                <SetupAdmin />
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
