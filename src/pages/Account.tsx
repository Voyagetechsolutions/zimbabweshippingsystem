
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CommunicationPreferences from '@/components/CommunicationPreferences';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationsPanel from '@/components/NotificationsPanel';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import MFASetup from '@/components/MFASetup';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Account = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  
  // Check if MFA is enabled for the user
  React.useEffect(() => {
    const checkMfaStatus = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('mfa_enabled')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          
          setMfaEnabled(data.mfa_enabled || false);
        } catch (error) {
          console.error('Error checking MFA status:', error);
          setMfaEnabled(false);
        }
      }
    };
    
    checkMfaStatus();
  }, [user]);
  
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
              {isAdmin && (
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
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Password</p>
                      <div className="flex justify-between items-center">
                        <p className="font-medium">••••••••</p>
                        <Button variant="outline" size="sm">
                          Change Password
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 mb-1">Two-Factor Authentication</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {mfaEnabled ? (
                            <>
                              <ShieldCheck className="h-5 w-5 mr-2 text-green-500" />
                              <span className="text-green-700">Enabled</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" />
                              <span className="text-amber-700">Not Enabled</span>
                            </>
                          )}
                        </div>
                        
                        <Dialog open={showMFADialog} onOpenChange={setShowMFADialog}>
                          <DialogTrigger asChild>
                            <Button 
                              variant={mfaEnabled ? "outline" : "default"}
                              size="sm"
                              className={mfaEnabled ? "" : "bg-zim-green hover:bg-zim-green/90"}
                            >
                              {mfaEnabled ? "Manage 2FA" : "Enable 2FA"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <MFASetup onComplete={() => {
                              setShowMFADialog(false);
                              setMfaEnabled(true);
                            }} />
                          </DialogContent>
                        </Dialog>
                      </div>
                      {isAdmin && !mfaEnabled && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs text-amber-800 flex items-center">
                            <Shield className="h-4 w-4 mr-1 text-amber-500" />
                            As an admin user, enabling two-factor authentication is strongly recommended.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 mb-1">Login Sessions</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          supabase.auth.signOut().then(() => {
                            toast({
                              title: "Signed Out",
                              description: "You have been signed out of all devices"
                            });
                          });
                        }}
                      >
                        Sign Out of All Devices
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="admin">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold mb-4">Admin Access</h2>
                    <p className="text-gray-600 mb-6">You have administrator privileges. Access the admin dashboard to manage the application.</p>
                    
                    {!mfaEnabled && (
                      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800 flex items-center font-medium">
                          <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" />
                          Security Recommendation
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          As an administrator, it's strongly recommended that you enable two-factor authentication to protect your account and sensitive data.
                        </p>
                        <Button 
                          className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                          size="sm"
                          onClick={() => setShowMFADialog(true)}
                        >
                          Set Up Two-Factor Authentication
                        </Button>
                      </div>
                    )}
                    
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
