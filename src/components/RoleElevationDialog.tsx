
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";
import { useRole, UserRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';

const RoleElevationDialog = () => {
  const [open, setOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const { role, elevateToAdmin } = useRole();
  const { toast } = useToast();

  const handleElevate = async () => {
    if (adminPassword) {
      const success = await elevateToAdmin(adminPassword);
      if (success) {
        setOpen(false);
        setAdminPassword('');
      }
    } else {
      toast({
        title: 'Password Required',
        description: 'Please enter the admin password',
        variant: 'destructive',
      });
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
          <DialogTitle>Admin Access Elevation</DialogTitle>
          <DialogDescription>
            Enter the admin password to elevate your access privileges.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              disabled // In this implementation, we only allow elevation to admin
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter secret password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              For testing, use the password: "Kulpalope101"
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-zim-green hover:bg-zim-green/90" onClick={handleElevate}>
            Elevate Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleElevationDialog;
