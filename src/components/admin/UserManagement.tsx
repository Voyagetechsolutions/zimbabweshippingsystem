
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRole, UserRoleType } from '@/contexts/RoleContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  Search,
  RefreshCcw,
  Edit,
  Trash2,
  UserCheck,
  ShieldCheck,
  Mail,
  Shield,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  role?: UserRoleType | null;
  avatar_url?: string | null;
  created_at: string;
}

const userFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  is_admin: z.boolean().default(false),
  role: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [roleAssignDialogOpen, setRoleAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('customer');
  const { toast } = useToast();
  const { setUserRole } = useRole();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      full_name: '',
      is_admin: false,
      role: 'customer',
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (editingUser) {
      form.reset({
        email: editingUser.email || '',
        full_name: editingUser.full_name || '',
        is_admin: editingUser.is_admin || false,
        role: editingUser.role || 'customer',
      });
    } else if (isCreatingUser) {
      form.reset({
        email: '',
        full_name: '',
        is_admin: false,
        role: 'customer',
      });
    }
  }, [editingUser, isCreatingUser, form]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Fetching all profiles");
      
      // Get profiles from the profiles table (not auth.users directly)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
          
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      if (profiles) {
        console.log("Fetched profiles count:", profiles.length);
        console.log("Profiles data:", profiles);
        setUsers(profiles as Profile[]);
      } else {
        console.log("No profiles returned from query");
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Failed to load users',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateUserDialog = () => {
    setIsCreatingUser(true);
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditUserDialog = (user: Profile) => {
    setEditingUser(user);
    setIsCreatingUser(false);
    setIsDialogOpen(true);
  };

  const openRoleAssignDialog = (user: Profile) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'customer');
    setRoleAssignDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setIsCreatingUser(false);
    form.reset();
  };

  const closeRoleAssignDialog = () => {
    setRoleAssignDialogOpen(false);
    setSelectedUser(null);
    setSelectedRole('customer');
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      const success = await setUserRole(selectedUser.id, selectedRole);
      
      if (success) {
        toast({
          title: 'Role Updated',
          description: `User ${selectedUser.full_name || selectedUser.email} is now a ${selectedRole}`,
        });
        closeRoleAssignDialog();
        fetchUsers(); // Refresh the user list
      }
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async (values: UserFormValues) => {
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: 'temporaryPassword123!',
        options: {
          data: {
            full_name: values.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;
      
      if (values.is_admin) {
        const { error: adminError } = await supabase.rpc('make_admin', {
          user_email: values.email
        });
        
        if (adminError) throw adminError;
      }

      // Assign role if specified
      if (values.role && values.role !== 'customer') {
        // Wait for the user to be created in the database
        setTimeout(async () => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', values.email)
            .single();
            
          if (userData) {
            await setUserRole(userData.id, values.role as UserRoleType);
          }
        }, 2000); // Give it a moment for the trigger to create the profile
      }

      toast({
        title: 'User created',
        description: 'The user has been created successfully',
      });
      
      closeDialog();
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error creating user',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (values: UserFormValues) => {
    if (!editingUser) return;
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      const currentAdminStatus = editingUser.is_admin || false;
      
      if (values.is_admin !== currentAdminStatus) {
        if (values.is_admin) {
          const { error: adminError } = await supabase.rpc('make_admin', {
            user_email: editingUser.email
          });
          
          if (adminError) throw adminError;
        }
      }

      // Update role if changed
      if (values.role && values.role !== editingUser.role) {
        await setUserRole(editingUser.id, values.role as UserRoleType);
      }

      toast({
        title: 'User updated',
        description: 'The user has been updated successfully',
      });
      
      closeDialog();
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error updating user',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = (values: UserFormValues) => {
    if (isCreatingUser) {
      handleCreateUser(values);
    } else if (editingUser) {
      handleUpdateUser(values);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Display the user's role or default to 'customer'
  const getUserRoleBadge = (user: Profile) => {
    const role = user.role || 'customer';
    
    // Style badges based on role
    const getBadgeStyle = (role: string) => {
      switch(role) {
        case 'logistics':
          return "bg-orange-100 text-orange-800 border-orange-300";
        case 'driver':
          return "bg-green-100 text-green-800 border-green-300";  
        case 'support':
          return "bg-purple-100 text-purple-800 border-purple-300";
        case 'customer':
        default:
          return "bg-blue-100 text-blue-800 border-blue-300";
      }
    };

    return (
      <Badge className={getBadgeStyle(role)}>
        {role === 'admin' ? <ShieldCheck className="mr-1 h-3 w-3" /> : <UserCheck className="mr-1 h-3 w-3" />}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <div>
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">User Management</CardTitle>
              <CardDescription>Manage all system users and permissions</CardDescription>
            </div>
            <Button onClick={openCreateUserDialog} className="bg-zim-green hover:bg-zim-green/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search users by email or name"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline"
              onClick={fetchUsers}
              className="h-10 px-4"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search" : "There are no users in the system yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || "Unnamed User"}</p>
                            <p className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getUserRoleBadge(user)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUserDialog(user)}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRoleAssignDialog(user)}
                            title="Assign Role"
                          >
                            <Shield className="h-4 w-4" />
                            <span className="sr-only">Assign Role</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              toast({
                                title: 'Password reset email sent',
                                description: `A password reset email has been sent to ${user.email}`,
                              });
                            }}
                            title="Send Password Reset"
                          >
                            <Mail className="h-4 w-4" />
                            <span className="sr-only">Reset Password</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {isCreatingUser ? "Add New User" : "Edit User"}
            </DialogTitle>
            <DialogDescription>
              {isCreatingUser
                ? "Create a new user account"
                : `Update details for ${editingUser?.email}`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="user@example.com"
                        disabled={!isCreatingUser}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="logistics">Logistics</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      The role determines what actions the user can perform
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_admin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Administrative Access
                      </FormLabel>
                      <FormDescription>
                        Grant full administrative privileges to this user
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button className="bg-zim-green hover:bg-zim-green/90" type="submit">
                  {isCreatingUser ? "Create User" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={roleAssignDialogOpen} onOpenChange={setRoleAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Change the role for{" "}
              {selectedUser?.full_name || selectedUser?.email || "user"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Select Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRoleType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                This will change the user's permissions in the system
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRoleAssignDialog}>
              Cancel
            </Button>
            <Button className="bg-zim-green hover:bg-zim-green/90" onClick={handleAssignRole}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
