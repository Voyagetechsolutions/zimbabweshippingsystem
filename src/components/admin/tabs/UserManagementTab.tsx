
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  RefreshCcw, 
  Plus, 
  Edit, 
  Trash2, 
  User,
  UserCog,
  KeyRound,
  Shield
} from 'lucide-react';

// Define types
interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_admin: boolean;
  last_login?: string;
  created_at: string;
}

interface UserFormData {
  email: string;
  full_name: string;
  role: string;
  is_admin: boolean;
}

const UserManagementTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    role: 'customer',
    is_admin: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // In a real implementation, fetch from Supabase
      // For demo purposes, using mock data
      const mockUsers: UserData[] = [
        {
          id: '1',
          email: 'admin@zimbabweshipping.com',
          full_name: 'Admin User',
          role: 'admin',
          is_admin: true,
          last_login: '2025-05-08T10:30:00',
          created_at: '2025-01-01T00:00:00'
        },
        {
          id: '2',
          email: 'driver1@zimbabweshipping.com',
          full_name: 'John Moyo',
          role: 'driver',
          is_admin: false,
          last_login: '2025-05-07T08:15:00',
          created_at: '2025-02-15T00:00:00'
        },
        {
          id: '3',
          email: 'support@zimbabweshipping.com',
          full_name: 'Grace Sibanda',
          role: 'support',
          is_admin: false,
          last_login: '2025-05-09T09:45:00',
          created_at: '2025-03-10T00:00:00'
        },
        {
          id: '4',
          email: 'logistics@zimbabweshipping.com',
          full_name: 'David Ncube',
          role: 'logistics',
          is_admin: false,
          last_login: '2025-05-08T14:20:00',
          created_at: '2025-03-20T00:00:00'
        }
      ];
      
      setUsers(mockUsers);
    } catch (error) {
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

  const openAddDialog = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'customer',
      is_admin: false
    });
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_admin: user.is_admin
    });
    setDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const handleAdminChange = (value: string) => {
    setFormData({
      ...formData,
      is_admin: value === 'true'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user
        // In production, this would update the Supabase database
        const updatedUsers = users.map(user => 
          user.id === editingUser.id ? { ...user, ...formData } : user
        );
        setUsers(updatedUsers);
        
        toast({
          title: 'User updated',
          description: `${formData.full_name}'s account has been updated`
        });
      } else {
        // Create new user
        // In production, this would insert into the Supabase database
        const newUser: UserData = {
          id: Math.random().toString(36).substring(7),
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_admin: formData.is_admin,
          created_at: new Date().toISOString()
        };
        
        setUsers([newUser, ...users]);
        
        toast({
          title: 'User created',
          description: `${formData.full_name}'s account has been created`
        });
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: 'Error',
        description: 'Failed to save user data',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      // In production, this would delete from Supabase
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      
      toast({
        title: 'User deleted',
        description: 'The user account has been removed'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'driver':
        return 'outline';
      case 'support':
        return 'secondary';
      case 'logistics':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage users, roles and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative flex-grow">
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-gray-500">
              Try adjusting your search or add a new user
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Admin Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Standard
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_login 
                        ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm')
                        : 'Never logged in'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* User Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[475px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? "Update the user's details and permissions" 
                  : "Create a new user account with appropriate permissions"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="email" className="text-right text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    className="col-span-3"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="full_name" className="text-right text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="full_name"
                    name="full_name"
                    className="col-span-3"
                    value={formData.full_name}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="role" className="text-right text-sm font-medium">
                    Role
                  </label>
                  <Select 
                    value={formData.role} 
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="is_admin" className="text-right text-sm font-medium">
                    Admin Status
                  </label>
                  <Select 
                    value={formData.is_admin ? 'true' : 'false'} 
                    onValueChange={handleAdminChange}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select admin status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Standard User</SelectItem>
                      <SelectItem value="true">Admin User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editingUser && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="password" className="text-right text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      className="col-span-3"
                      placeholder="Auto-generated if left empty"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Audit Log</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{format(new Date(), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>admin@zimbabweshipping.com</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <UserCog className="h-3 w-3 mr-1" />
                      Role Change
                    </Badge>
                  </TableCell>
                  <TableCell>Changed user john@example.com role from customer to driver</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{format(new Date(Date.now() - 3600000), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>admin@zimbabweshipping.com</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <KeyRound className="h-3 w-3 mr-1" />
                      Login
                    </Badge>
                  </TableCell>
                  <TableCell>Successful login from IP 192.168.1.1</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{format(new Date(Date.now() - 86400000), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>admin@zimbabweshipping.com</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Shield className="h-3 w-3 mr-1" />
                      Permission
                    </Badge>
                  </TableCell>
                  <TableCell>Changed permission for reports access</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagementTab;
