
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

interface CommunicationPreferencesProps {
  onUpdate?: () => void;
}

interface Preferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

const CommunicationPreferences: React.FC<CommunicationPreferencesProps> = ({ onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Preferences>({
    email: true,
    sms: false,
    push: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('communication_preferences')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data && data.communication_preferences) {
          setPreferences(data.communication_preferences as unknown as Preferences);
        }
      } catch (error: any) {
        console.error('Error fetching communication preferences:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const handleToggle = (key: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          communication_preferences: preferences as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Preferences updated',
        description: 'Your communication preferences have been saved.',
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error saving communication preferences:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to update communication preferences.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="bg-zim-green/10 p-3 rounded-full">
            <Bell className="h-6 w-6 text-zim-green" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Communication Preferences</CardTitle>
            <CardDescription>Manage how we contact you</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-2 rounded-full">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive updates about your shipments via email</p>
            </div>
          </div>
          <Switch 
            checked={preferences.email} 
            onCheckedChange={() => handleToggle('email')} 
            aria-label="Toggle email notifications" 
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-2 rounded-full">
              <Smartphone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-gray-500">Receive text messages with shipping updates</p>
            </div>
          </div>
          <Switch 
            checked={preferences.sms} 
            onCheckedChange={() => handleToggle('sms')} 
            aria-label="Toggle SMS notifications" 
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-2 rounded-full">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-500">Receive push notifications on your device</p>
            </div>
          </div>
          <Switch 
            checked={preferences.push} 
            onCheckedChange={() => handleToggle('push')} 
            aria-label="Toggle push notifications" 
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="bg-zim-green hover:bg-zim-green/90 ml-auto"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CommunicationPreferences;
