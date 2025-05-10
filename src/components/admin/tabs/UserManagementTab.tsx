
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import {
  User,
  Search,
  RefreshCcw,
  Filter,
  UserPlus,
  Edit,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_admin: boolean | null;
  created_at: string;
  updated_at: string;
  communication_preferences: any;
}

const UserManagementTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formIsAdmin, setFormIsAdmin] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

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
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.full_name && user.full_name.toLowerCase().includes(query)) ||
        user.email.toLowerCase().includes(query) ||
        (user.role && user.role.toLowerCase().includes(query))
      );
    }
    
    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin') {
        filtered = filtered.filter(user => user.is_admin === true);
      } else {
        filtered = filtered.filter(user => user.role === roleFilter);
      }
    }
    
    setFilteredUsers(filtered);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setFormName(user.full_name || '');
    setFormRole(user.role || 'customer');
    setFormIsAdmin(user.is_admin || false);
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Prepare updated user data
      const updatedData: any = {
        full_name: formName,
        role: formRole,
        is_admin: formIsAdmin,
        updated_at: new Date().toISOString()
      };
      
      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', selectedUser.id);
        
      if (error) throw error;
      
      toast({
        title: 'User Updated',
        description: `${formName}'s profile has been updated successfully`,
      });
      
      // Close dialog and refresh users
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update user profile',
        variant: 'destructive'
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (user: UserProfile) => {
    if (user.is_admin) {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-300">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    
    if (user.role === 'driver') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          Driver
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        {user.role || 'Customer'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">User Management</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchUsers}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by name, email, or role"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="driver">Drivers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchQuery || roleFilter !== 'all'
                  ? "Try adjusting your search filters"
                  : "No users have registered yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {user.avatar_url ? (
                              <AvatarImage src={user.avatar_url} alt={user.full_name || ''} />
                            ) : (
                              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user)}</TableCell>
                      <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role permissions
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  {selectedUser.avatar_url ? (
                    <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.full_name || ''} />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedUser.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedUser.full_name || 'Unnamed User'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="adminAccess" 
                  checked={formIsAdmin}
                  onCheckedChange={(checked) => setFormIsAdmin(!!checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="adminAccess"
                    className="text-sm font-medium leading-none flex items-center gap-2"
                  >
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    Admin Access
                  </label>
                  <p className="text-sm text-muted-foreground">
                    User will have complete access to all admin features and can manage other users.
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} className="bg-zim-green hover:bg-zim-green/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementTab;
