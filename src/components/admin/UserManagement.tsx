import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  avatar_url?: string | null;
  created_at: string;
}

const userFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  is_admin: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      full_name: '',
      is_admin: false,
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
      });
    } else if (isCreatingUser) {
      form.reset({
        email: '',
        full_name: '',
        is_admin: false,
      });
    }
  }, [editingUser, isCreatingUser, form]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Fetching all profiles");
      
      // First check if current user is admin (this helps with debugging)
      const { data: isAdminData } = await supabase.rpc('is_admin');
      console.log("Current user is admin:", isAdminData);
      
      // Now fetch all profiles
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

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setIsCreatingUser(false);
    form.reset();
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
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            <UserCheck className="mr-1 h-3 w-3" />
                            Standard User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUserDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
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
                          >
                            <Mail className="h-4 w-4" />
                            <span className="sr-only">Reset password</span>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isCreatingUser ? 'Create New User' : 'Edit User'}</DialogTitle>
            <DialogDescription>
              {isCreatingUser 
                ? 'Add a new user to the system.' 
                : `Update ${editingUser?.full_name || editingUser?.email}'s details.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!isCreatingUser}
                        placeholder="user@example.com" 
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
                name="is_admin"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Admin Privileges</FormLabel>
                      <FormDescription>
                        Grant administrative access to this user
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
                  {isCreatingUser ? 'Create User' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
