
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@/types/admin';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2
} from "lucide-react";

const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const { toast } = useToast();
  
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    view_shipments: false,
    create_shipments: false,
    edit_shipments: false,
    delete_shipments: false,
    view_users: false,
    edit_users: false,
    view_analytics: false,
    manage_settings: false,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      // In a real app, you would fetch from a roles table
      // For now we'll simulate with some data
      const mockRoles: Role[] = [
        {
          id: '1',
          name: 'Administrator',
          description: 'Full access to all features',
          permissions: {
            shipments: true,
            users: true,
            analytics: true,
            settings: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Manager',
          description: 'Can manage shipments and view analytics',
          permissions: {
            shipments: true,
            users: { view: true, edit: false },
            analytics: true,
            settings: false
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Customer Support',
          description: 'Can view shipments and help customers',
          permissions: {
            shipments: { view: true, edit: true, create: false, delete: false },
            users: { view: true, edit: false },
            analytics: false,
            settings: false
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setRoles(mockRoles);
    } catch (error) {
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

  const handleEditRole = (role: Role) => {
    setCurrentRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    
    // Convert complex permissions structure to flat boolean map
    const flatPermissions: Record<string, boolean> = {};
    
    Object.entries(role.permissions).forEach(([category, value]) => {
      if (typeof value === 'boolean') {
        flatPermissions[`${category}`] = value;
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([action, enabled]) => {
          flatPermissions[`${category}_${action}`] = enabled as boolean;
        });
      }
    });
    
    setPermissions({
      view_shipments: flatPermissions.shipments_view || flatPermissions.shipments || false,
      create_shipments: flatPermissions.shipments_create || flatPermissions.shipments || false,
      edit_shipments: flatPermissions.shipments_edit || flatPermissions.shipments || false,
      delete_shipments: flatPermissions.shipments_delete || flatPermissions.shipments || false,
      view_users: flatPermissions.users_view || flatPermissions.users || false,
      edit_users: flatPermissions.users_edit || flatPermissions.users || false,
      view_analytics: flatPermissions.analytics || false,
      manage_settings: flatPermissions.settings || false,
    });
    
    setIsDialogOpen(true);
  };

  const handleNewRole = () => {
    setCurrentRole(null);
    setRoleName('');
    setRoleDescription('');
    setPermissions({
      view_shipments: false,
      create_shipments: false,
      edit_shipments: false,
      delete_shipments: false,
      view_users: false,
      edit_users: false,
      view_analytics: false,
      manage_settings: false,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    setCurrentRole(role);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!currentRole) return;
    
    try {
      // In a real app, you would delete from the database
      // For now we'll just remove from state
      setRoles(roles.filter(r => r.id !== currentRole.id));
      
      toast({
        title: 'Role deleted',
        description: `${currentRole.name} role has been deleted`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const saveRole = async () => {
    if (!roleName) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Convert flat permissions back to structured format
      const structuredPermissions = {
        shipments: {
          view: permissions.view_shipments,
          create: permissions.create_shipments,
          edit: permissions.edit_shipments,
          delete: permissions.delete_shipments
        },
        users: {
          view: permissions.view_users,
          edit: permissions.edit_users
        },
        analytics: permissions.view_analytics,
        settings: permissions.manage_settings
      };
      
      // In a real app, you would save to the database
      const now = new Date().toISOString();
      
      if (currentRole) {
        // Update existing role
        const updatedRole = {
          ...currentRole,
          name: roleName,
          description: roleDescription,
          permissions: structuredPermissions,
          updated_at: now
        };
        
        setRoles(roles.map(role => 
          role.id === currentRole.id ? updatedRole : role
        ));
        
        toast({
          title: 'Role updated',
          description: `${roleName} role has been updated`,
        });
      } else {
        // Create new role
        const newRole: Role = {
          id: `new-${Date.now()}`,
          name: roleName,
          description: roleDescription,
          permissions: structuredPermissions,
          created_at: now,
          updated_at: now
        };
        
        setRoles([...roles, newRole]);
        
        toast({
          title: 'Role created',
          description: `${roleName} role has been created`,
        });
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save role',
        variant: 'destructive',
      });
    }
  };

  const renderPermissionStatus = (role: Role, permission: string) => {
    const permissionMap: Record<string, any> = {
      'shipments': role.permissions.shipments,
      'users': role.permissions.users,
      'analytics': role.permissions.analytics,
      'settings': role.permissions.settings
    };
    
    const permValue = permissionMap[permission];
    
    if (typeof permValue === 'boolean') {
      return permValue ? (
        <span className="text-green-600 font-medium">Full Access</span>
      ) : (
        <span className="text-red-600 font-medium">No Access</span>
      );
    }
    
    if (typeof permValue === 'object') {
      const hasAnyPermission = Object.values(permValue).some(v => v);
      
      if (hasAnyPermission) {
        const permissions = Object.entries(permValue)
          .filter(([_, v]) => v)
          .map(([k]) => k);
        
        return (
          <span className="text-yellow-600 font-medium">
            Limited: {permissions.join(', ')}
          </span>
        );
      } else {
        return <span className="text-red-600 font-medium">No Access</span>;
      }
    }
    
    return <span className="text-gray-400">Unknown</span>;
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Role Management</CardTitle>
              <CardDescription>Manage roles and permissions</CardDescription>
            </div>
            <Button onClick={handleNewRole} className="bg-zim-green hover:bg-zim-green/90">
              <Plus className="h-4 w-4 mr-2" /> Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-zim-green" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center p-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No roles found</h3>
              <p className="text-gray-500">
                Create roles to manage user permissions
              </p>
              <Button 
                onClick={handleNewRole} 
                className="mt-4 bg-zim-green hover:bg-zim-green/90"
              >
                <Plus className="h-4 w-4 mr-2" /> Add First Role
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Shipments</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Analytics</TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description || '-'}</TableCell>
                      <TableCell>{renderPermissionStatus(role, 'shipments')}</TableCell>
                      <TableCell>{renderPermissionStatus(role, 'users')}</TableCell>
                      <TableCell>{renderPermissionStatus(role, 'analytics')}</TableCell>
                      <TableCell>{renderPermissionStatus(role, 'settings')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditRole(role)}
                          className="mr-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteRole(role)}
                          className="text-red-500 hover:text-red-700"
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
        </CardContent>
      </Card>

      {/* Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentRole ? `Edit ${currentRole.name} Role` : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              Configure the role name and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="role-name">Role Name</Label>
                <Input 
                  id="role-name" 
                  value={roleName} 
                  onChange={e => setRoleName(e.target.value)}
                  placeholder="Enter role name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="role-description">Description</Label>
                <Textarea 
                  id="role-description" 
                  value={roleDescription} 
                  onChange={e => setRoleDescription(e.target.value)}
                  placeholder="Enter role description"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Permissions</h3>
              
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-2">Shipment Permissions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="view-shipments" 
                        checked={permissions.view_shipments}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, view_shipments: !!checked})
                        }
                      />
                      <Label htmlFor="view-shipments">View Shipments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="create-shipments" 
                        checked={permissions.create_shipments}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, create_shipments: !!checked})
                        }
                      />
                      <Label htmlFor="create-shipments">Create Shipments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="edit-shipments" 
                        checked={permissions.edit_shipments}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, edit_shipments: !!checked})
                        }
                      />
                      <Label htmlFor="edit-shipments">Edit Shipments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="delete-shipments" 
                        checked={permissions.delete_shipments}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, delete_shipments: !!checked})
                        }
                      />
                      <Label htmlFor="delete-shipments">Delete Shipments</Label>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-2">User Permissions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="view-users" 
                        checked={permissions.view_users}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, view_users: !!checked})
                        }
                      />
                      <Label htmlFor="view-users">View Users</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="edit-users" 
                        checked={permissions.edit_users}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, edit_users: !!checked})
                        }
                      />
                      <Label htmlFor="edit-users">Edit Users</Label>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-2">Other Permissions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="view-analytics" 
                        checked={permissions.view_analytics}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, view_analytics: !!checked})
                        }
                      />
                      <Label htmlFor="view-analytics">View Analytics</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="manage-settings" 
                        checked={permissions.manage_settings}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, manage_settings: !!checked})
                        }
                      />
                      <Label htmlFor="manage-settings">Manage Settings</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRole} className="bg-zim-green hover:bg-zim-green/90">
              {currentRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the {currentRole?.name} role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteRole}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
