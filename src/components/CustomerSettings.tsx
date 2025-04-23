
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Shield } from 'lucide-react';

const CustomerSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    showShipmentValue: false,
    autoTrackingUpdates: true,
    twoFactorAuth: false,
    phone: ''
  });
  
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }
        
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {  // PGRST116 is "no rows found" error
          throw error;
        }
        
        if (data) {
          setSettings({
            emailNotifications: data.email_notifications ?? true,
            smsNotifications: data.sms_notifications ?? false,
            marketingEmails: data.marketing_emails ?? false,
            showShipmentValue: data.show_shipment_value ?? false,
            autoTrackingUpdates: data.auto_tracking_updates ?? true,
            twoFactorAuth: data.two_factor_auth ?? false,
            phone: data.phone || ''
          });
        }
        
        // Also get user profile for phone number if not in settings
        if (!data?.phone) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single();
          
          if (profileData?.phone) {
            setSettings(prev => ({
              ...prev,
              phone: profileData.phone
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
        toast({
          title: "Error",
          description: "Failed to load your settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserSettings();
  }, [toast]);
  
  const handleSettingChange = (field: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const saveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to save settings",
          variant: "destructive",
        });
        return;
      }
      
      // Check if settings record exists
      const { data: existingSettings, error: checkError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      let upsertError;
      
      if (!existingSettings) {
        // Create new settings
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            email_notifications: settings.emailNotifications,
            sms_notifications: settings.smsNotifications,
            marketing_emails: settings.marketingEmails,
            show_shipment_value: settings.showShipmentValue,
            auto_tracking_updates: settings.autoTrackingUpdates,
            two_factor_auth: settings.twoFactorAuth,
            phone: settings.phone
          });
        
        upsertError = error;
      } else {
        // Update existing settings
        const { error } = await supabase
          .from('user_settings')
          .update({
            email_notifications: settings.emailNotifications,
            sms_notifications: settings.smsNotifications,
            marketing_emails: settings.marketingEmails,
            show_shipment_value: settings.showShipmentValue,
            auto_tracking_updates: settings.autoTrackingUpdates,
            two_factor_auth: settings.twoFactorAuth,
            phone: settings.phone
          })
          .eq('user_id', user.id);
        
        upsertError = error;
      }
      
      // Also update phone in profile
      await supabase
        .from('profiles')
        .update({
          phone: settings.phone
        })
        .eq('id', user.id);
      
      if (upsertError) throw upsertError;
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully",
      });
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card>
          <CardHeader className="pb-3">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive shipment updates and alerts via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive shipment updates and alerts via SMS
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
            />
          </div>
          
          {settings.smsNotifications && (
            <div className="flex items-end gap-4 mt-2">
              <div className="flex-grow space-y-2">
                <Label htmlFor="phone">Phone Number for SMS</Label>
                <Input
                  id="phone"
                  placeholder="e.g., +44 7123 456789"
                  value={settings.phone}
                  onChange={(e) => handleSettingChange('phone', e.target.value)}
                />
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Communications</Label>
              <p className="text-sm text-gray-500">
                Receive promotions, news, and special offers
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => handleSettingChange('marketingEmails', checked)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-shipment-value">Display Shipment Values</Label>
              <p className="text-sm text-gray-500">
                Show monetary values of shipments in tracking information
              </p>
            </div>
            <Switch
              id="show-shipment-value"
              checked={settings.showShipmentValue}
              onCheckedChange={(checked) => handleSettingChange('showShipmentValue', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-tracking">Automatic Tracking Updates</Label>
              <p className="text-sm text-gray-500">
                Automatically check for tracking updates when viewing shipments
              </p>
            </div>
            <Switch
              id="auto-tracking"
              checked={settings.autoTrackingUpdates}
              onCheckedChange={(checked) => handleSettingChange('autoTrackingUpdates', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor-auth">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              id="two-factor-auth"
              checked={settings.twoFactorAuth}
              onCheckedChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            You can request to download your personal data or delete your account if needed. 
            Please contact our support team for assistance.
          </p>
          
          <div className="flex gap-4">
            <Button variant="outline">
              Request Data Download
            </Button>
            <Button variant="destructive">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <CardFooter className="flex justify-end pt-6">
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="bg-zim-green hover:bg-zim-green/90"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </div>
  );
};

export default CustomerSettings;
