
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { getClientIP, handleAuthError } from '@/utils/securityUtils';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

const RoleElevationDialog = () => {
  const [open, setOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { role, elevateToAdmin } = useRole();
  const { toast } = useToast();

  const handleElevate = async () => {
    if (!adminPassword) {
      toast({
        title: 'Password Required',
        description: 'Please enter the admin password',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const clientIP = await getClientIP();
      
      // Check for IP-based rate limiting first
      const { data: canAttempt, error: checkError } = await supabase.rpc(
        'check_and_log_failed_auth_attempt',
        { ip_address: clientIP }
      );

      if (checkError || !canAttempt) {
        toast({
          title: 'Access Temporarily Blocked',
          description: 'Too many failed attempts. Please try again later.',
          variant: 'destructive',
        });
        setOpen(false);
        return;
      }

      const success = await elevateToAdmin(adminPassword);
      
      if (success) {
        setOpen(false);
        setAdminPassword('');
        toast({
          title: 'Access Granted',
          description: 'You now have administrative privileges.',
        });
      } else {
        handleAuthError({ message: 'Invalid admin password' }, toast);
      }
    } catch (error: any) {
      handleAuthError(error, toast);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show the elevation dialog if not already an admin
  if (role === 'admin') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShieldAlert className="h-4 w-4" />
          Elevate Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Staff Access Elevation</DialogTitle>
          <DialogDescription>
            Enter the admin password to elevate your access privileges.
            Multiple failed attempts will result in temporary lockout.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleElevate();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleElevate} 
            disabled={isSubmitting}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Elevate Access'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleElevationDialog;
