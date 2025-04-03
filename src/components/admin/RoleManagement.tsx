import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Role, castTo } from '@/types/admin';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Search,
  RefreshCcw,
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const roleFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.record(
    z.string(),
    z.union([
      z.boolean(),
      z.record(z.string(), z.boolean())
    ])
  )
});

const permissionSections = [
  {
    id: 'admin',
    name: 'Admin',
    type: 'boolean',
  },
  {
    id: 'shipments',
    name: 'Shipments',
    type: 'object',
    actions: ['read', 'write', 'delete']
  },
  {
    id: 'users',
    name: 'Users',
    type: 'object',
    actions: ['read', 'write', 'delete']
  },
  {
    id: 'reports',
    name: 'Reports',
    type: 'object',
    actions: ['read', 'write']
  },
  {
    id: 'support',
    name: 'Support',
    type: 'object',
    actions: ['read', 'write']
  },
  {
    id: 'settings',
    name: 'Settings',
    type: 'object',
    actions: ['read', 'write']
  }
];

const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [viewingPermissions, setViewingPermissions] = useState<Role | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: {
        admin: false,
        shipments: { read: false, write: false, delete: false },
        users: { read: false, write: false, delete: false },
        reports: { read: false, write: false },
        support: { read: false, write: false },
        settings: { read: false, write: false }
      }
    }
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (editingRole) {
      form.reset({
        name: editingRole.name,
        description: editingRole.description || '',
        permissions: editingRole.permissions
      });
    } else if (isCreatingRole) {
      form.reset({
        name: '',
        description: '',
        permissions: {
          admin: false,
          shipments: { read: false, write: false, delete: false },
          users: { read: false, write: false, delete: false },
          reports: { read: false, write: false },
          support: { read: false, write: false },
          settings: { read: false, write: false }
        }
      });
    }
  }, [editingRole, isCreatingRole, form]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('user_roles' as any)
        .select('*')
        .order('name', { ascending: true }) as any);

      if (error) throw error;
      
      if (data) {
        setRoles(castTo<Role[]>(data));
      }
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateRoleDialog = () => {
    setIsCreatingRole(true);
    setEditingRole(null);
    setIsDialogOpen(true);
  };

  const openEditRoleDialog = (role: Role) => {
    setEditingRole(role);
    setIsCreatingRole(false);
    setIsDialogOpen(true);
  };

  const openViewPermissionsDialog = (role: Role) => {
    setViewingPermissions(role);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setIsCreatingRole(false);
    form.reset();
  };

  const handleCreateRole = async (values: z.infer<typeof roleFormSchema>) => {
    try {
      const { error } = await (supabase
        .from('user_roles' as any)
        .insert({
          name: values.name,
          description: values.description || null,
          permissions: values.permissions
        }) as any);

      if (error) throw error;
      
      toast({
        title: 'Role Created',
        description: 'The role has been created successfully',
      });
      
      closeDialog();
      fetchRoles();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (values: z.infer<typeof roleFormSchema>) => {
    if (!editingRole) return;
    
    try {
      const { error } = await (supabase
        .from('user_roles' as any)
        .update({
          name: values.name,
          description: values.description || null,
          permissions: values.permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRole.id) as any);

      if (error) throw error;
      
      toast({
        title: 'Role Updated',
        description: 'The role has been updated successfully',
      });
      
      closeDialog();
      fetchRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRole = async (role: Role) => {
    // Check if this is a system role (not allowing delete for Admin, Support, Manager)
    if (['Admin', 'Support', 'Manager'].includes(role.name)) {
      toast({
        title: 'Cannot Delete',
        description: 'System roles cannot be deleted',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await (supabase
        .from('user_roles' as any)
        .delete()
        .eq('id', role.id) as any);

      if (error) throw error;
      
      toast({
        title: 'Role Deleted',
        description: 'The role has been deleted successfully',
      });
      
      fetchRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = (values: z.infer<typeof roleFormSchema>) => {
    if (isCreatingRole) {
      handleCreateRole(values);
    } else if (editingRole) {
      handleUpdateRole(values);
    }
  };

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderPermissionSection = (section: any) => {
    if (section.type === 'boolean') {
      return (
        <FormField
          key={section.id}
          control={form.control}
          name={`permissions.${section.id}`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium">
                  {section.name}
                </FormLabel>
                <FormDescription>
                  Full {section.name.toLowerCase()} access
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      );
    }
    
    return (
      <div key={section.id} className="space-y-3 rounded-md border p-4">
        <h4 className="font-medium">{section.name}</h4>
        <div className="grid grid-cols-2 gap-3">
          {section.actions.map((action: string) => (
            <FormField
              key={`${section.id}.${action}`}
              control={form.control}
              name={`permissions.${section.id}.${action}`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value as boolean}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="leading-none">
                    <FormLabel className="text-sm capitalize">
                      {action}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderPermissionDisplay = (permissions: any, section: any) => {
    if (section.type === 'boolean') {
      return permissions[section.id] ? (
        <Badge className="bg-green-100 text-green-800 border-green-300">Enabled</Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">Disabled</Badge>
      );
    }
    
    const sectionPerms = permissions[section.id] || {};
    const enabledActions = Object.entries(sectionPerms)
      .filter(([_, enabled]) => enabled)
      .map(([action, _]) => action);
    
    return enabledActions.length ? (
      <div className="flex flex-wrap gap-1">
        {enabledActions.map(action => (
          <Badge key={action} className="bg-blue-100 text-blue-800 border-blue-300 capitalize">
            {action}
          </Badge>
        ))}
      </div>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-gray-300">No permissions</Badge>
    );
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Role Management</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </div>
            <Button onClick={openCreateRoleDialog} className="bg-zim-green hover:bg-zim-green/90">
              <Plus className="mr-2 h-4 w-4" />
              Add New Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search roles..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline"
              onClick={fetchRoles}
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
          ) : filteredRoles.length === 0 ? (
            <div className="text-center p-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No roles found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search" : "There are no roles in the system yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="h-5 w-5 text-zim-green" />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {role.description || "No description"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openViewPermissionsDialog(role)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditRoleDialog(role)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRole(role)}
                            disabled={['Admin', 'Support', 'Manager'].includes(role.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isCreatingRole ? 'Create New Role' : 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {isCreatingRole 
                ? 'Add a new role with specific permissions.' 
                : `Update ${editingRole?.name}'s details and permissions.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Dispatcher" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe the role's purpose and responsibilities" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Permissions</h3>
                <div className="space-y-4">
                  {permissionSections.map(renderPermissionSection)}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button className="bg-zim-green hover:bg-zim-green/90" type="submit">
                  {isCreatingRole ? 'Create Role' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPermissions} onOpenChange={(open) => !open && setViewingPermissions(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Role Permissions: {viewingPermissions?.name}</DialogTitle>
            <DialogDescription>
              Detailed view of permissions for this role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {viewingPermissions && permissionSections.map(section => (
              <div key={section.id} className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{section.name}</h3>
                  {renderPermissionDisplay(viewingPermissions.permissions, section)}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingPermissions(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
