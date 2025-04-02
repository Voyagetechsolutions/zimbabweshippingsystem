
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SetupAdmin = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter the email of the user to set as admin",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // First, check if there are no admin users yet
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true)
        .limit(1);
      
      if (profilesError) throw profilesError;
      
      if (profiles && profiles.length > 0) {
        toast({
          title: "Admin already exists",
          description: "An admin user already exists in the system. Additional admins can only be added by an existing admin.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Get the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (userError) {
        if (userError.code === 'PGRST116') {
          toast({
            title: "User not found",
            description: `No user found with email: ${email}. Please make sure the user has registered.`,
            variant: "destructive",
          });
        } else {
          throw userError;
        }
        setLoading(false);
        return;
      }
      
      // Set the user as admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', userData.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Admin created successfully",
        description: `User ${email} is now an admin.`,
      });
      
      // Reload the page to refresh the admin status
      window.location.reload();
      
    } catch (error: any) {
      console.error('Error setting up admin:', error);
      toast({
        title: "Failed to set up admin",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Admin User</CardTitle>
        <CardDescription>
          No admin exists yet. Set up a user as the first admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetupAdmin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-sm text-gray-500">
              Enter the email of an existing user to make them an admin.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full bg-zim-green hover:bg-zim-green/90"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Set as Admin"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
