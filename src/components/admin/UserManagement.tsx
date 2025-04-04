
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  RefreshCcw,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  phone: string | null;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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
      
      if (data) {
        setUsers(data as User[]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);

      if (error) throw error;
      
      toast({
        title: `User ${isAdmin ? 'removed from' : 'added to'} admins`,
        description: `User has been ${isAdmin ? 'removed from' : 'added to'} the admin group.`,
      });
      
      // Refresh the users list
      fetchUsers();
      
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user admin status',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      searchQuery === '' ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">User Management</CardTitle>
              <CardDescription>Manage users and permissions</CardDescription>
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
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Input
              placeholder="Search users by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search" : "There are no users in the system"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name || 'No Name'}</div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Admin
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at 
                          ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy') 
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                            >
                              {user.is_admin ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  <span>Remove Admin</span>
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  <span>Make Admin</span>
                                </>
                              )}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
