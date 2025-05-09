
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { 
  Users, 
  Search, 
  MoreHorizontal, 
  Shield, 
  User,
  Loader2,
  Mail,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  mfa_enabled: boolean;
}

const UserManagementTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Edit user state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditIsAdmin(user.is_admin);
  };
  
  const updateUserRole = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          is_admin: editIsAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id
            ? { ...user, role: editRole, is_admin: editIsAdmin, updated_at: new Date().toISOString() }
            : user
        )
      );
      
      toast({
        title: 'User updated',
        description: `${selectedUser.full_name || selectedUser.email}'s role has been updated`,
      });
      
      // Close dialog
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Filter users based on search query and role filter
  const filteredUsers = users.filter(user => {
    const matchesRole = 
      roleFilter === 'all' || 
      (roleFilter === 'admin' && user.is_admin) ||
      (roleFilter !== 'admin' && user.role === roleFilter);
    
    const matchesSearch =
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesRole && matchesSearch;
  });

  const getRoleBadge = (user: UserProfile) => {
    if (user.is_admin) {
      return <Badge className="bg-purple-100 text-purple-800 border border-purple-300">Admin</Badge>;
    }
    
    switch (user.role) {
      case 'customer':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Customer</Badge>;
      case 'staff':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Staff</Badge>;
      case 'driver':
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Driver</Badge>;
      case 'warehouse':
        return <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300">Warehouse</Badge>;
      default:
        return <Badge variant="outline">{user.role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">User Management</CardTitle>
            <CardDescription>
              Manage users and assign roles
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUsers} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={roleFilter} 
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No users found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery || roleFilter !== 'all' ? "Try adjusting your filters" : "There are no users in the system"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>MFA</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.full_name || "User"}
                                    className="rounded-full w-8 h-8 object-cover"
                                  />
                                ) : (
                                  <User className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.full_name || "Unnamed User"}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user)}</TableCell>
                          <TableCell>
                            {user.mfa_enabled ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">Enabled</Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(user.updated_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Manage Role
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Contact User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Disable Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
          
          {/* Edit User Dialog */}
          <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogDescription>
                  Update role and permissions for {selectedUser?.full_name || selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              
              {selectedUser && (
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="userRole">User Role</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isAdmin" 
                      checked={editIsAdmin}
                      onChange={(e) => setEditIsAdmin(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="isAdmin" className="cursor-pointer">
                      Grant Admin Privileges
                    </Label>
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-2">
                    <p className="flex items-center">
                      <Shield className="h-4 w-4 mr-1 text-amber-500" />
                      <span>
                        Admins have full access to all system features and settings.
                      </span>
                    </p>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                <Button 
                  onClick={updateUserRole} 
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementTab;
