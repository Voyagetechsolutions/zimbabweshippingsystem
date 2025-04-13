
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CommunicationPreferences from '@/components/CommunicationPreferences';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationsPanel from '@/components/NotificationsPanel';

const Account = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="absolute top-4 right-20 z-10">
        <NotificationsPanel />
      </div>
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              {user?.is_admin && (
                <TabsTrigger value="admin">Admin</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile">
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-mono text-sm">{user?.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="communication">
              <div className="space-y-6">
                <CommunicationPreferences />
              </div>
            </TabsContent>
            
            <TabsContent value="security">
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
                  <p className="text-gray-600 mb-4">Manage your account security settings here.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Password</p>
                      <p className="font-medium">••••••••</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {user?.is_admin && (
              <TabsContent value="admin">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold mb-4">Admin Access</h2>
                    <p className="text-gray-600 mb-6">You have administrator privileges. Access the admin dashboard to manage the application.</p>
                    <a href="/admin" className="bg-zim-green hover:bg-zim-green/90 text-white py-2 px-4 rounded">
                      Go to Admin Dashboard
                    </a>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Account;
