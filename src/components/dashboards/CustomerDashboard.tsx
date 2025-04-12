
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { RecentShipments } from '../customer/RecentShipments';
import { supabase } from '@/integrations/supabase/client';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
          } else {
            setProfileData(data);
          }
        }
      } catch (error) {
        console.error('Error in fetchProfileData:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm text-gray-600">{user?.email || 'Not available'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-sm font-medium">Account Type:</span>
              <span className="text-sm text-gray-600 capitalize">{role || 'Customer'}</span>
            </div>
            {profileData && profileData.full_name && (
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm text-gray-600">{profileData.full_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Shipments Section */}
      <RecentShipments />
    </div>
  );
};

export default CustomerDashboard;
