
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CommunicationPreferences from '@/components/CommunicationPreferences';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom'
  });
  
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  useEffect(() => {
    // Set page title
    document.title = 'My Profile | UK to Zimbabwe Shipping';
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Fetch user profile data
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            email: user.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            postcode: data.postcode || '',
            country: data.country || 'United Kingdom'
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setLoadingProfile(false);
      }
    };
    
    fetchProfile();
  }, [user, navigate, toast]);
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFields(prev => ({ ...prev, [name]: value }));
  };
  
  const saveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          postcode: profile.postcode,
          country: profile.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordFields;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all password fields',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // First verify the current password by attempting a login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      
      if (signInError) throw new Error('Current password is incorrect');
      
      // If login succeeded, update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      // Clear password fields
      setPasswordFields({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully changed',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Password change failed',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600">Manage your account details and preferences</p>
          </div>
          
          <Tabs defaultValue="profile">
            <TabsList className="mb-8">
              <TabsTrigger value="profile">Profile Details</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingProfile ? (
                    <div className="space-y-3">
                      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First name</Label>
                          <Input 
                            id="firstName"
                            name="firstName"
                            value={profile.firstName}
                            onChange={handleProfileChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input 
                            id="lastName"
                            name="lastName"
                            value={profile.lastName}
                            onChange={handleProfileChange}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email"
                          name="email"
                          value={profile.email}
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-sm text-gray-500">Email cannot be changed</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone number</Label>
                        <Input 
                          id="phone"
                          name="phone"
                          value={profile.phone}
                          onChange={handleProfileChange}
                          placeholder="e.g., +44 7123 456789"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input 
                          id="address"
                          name="address"
                          value={profile.address}
                          onChange={handleProfileChange}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input 
                            id="city"
                            name="city"
                            value={profile.city}
                            onChange={handleProfileChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postcode">Postcode</Label>
                          <Input 
                            id="postcode"
                            name="postcode"
                            value={profile.postcode}
                            onChange={handleProfileChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input 
                            id="country"
                            name="country"
                            value={profile.country}
                            onChange={handleProfileChange}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={saveProfile}
                    disabled={loading || loadingProfile}
                    className="bg-zim-green hover:bg-zim-green/90"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordFields.currentPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordFields.newPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordFields.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={changePassword}
                    disabled={loading}
                    className="bg-zim-green hover:bg-zim-green/90"
                  >
                    {loading ? 'Updating...' : 'Change Password'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="communication">
              <CommunicationPreferences />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProfilePage;
