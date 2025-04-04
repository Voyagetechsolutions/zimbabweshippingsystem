import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SystemSetting, castTo } from '@/types/admin';
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
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/form";
import {
  Settings,
  Search,
  RefreshCcw,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface EditingFormValues {
  key: string;
  value: string;
}

const formSchema = z.object({
  key: z
    .string()
    .min(2, "Key must be at least 2 characters")
    .regex(/^[a-z0-9_]+$/, "Key must contain only lowercase letters, numbers, and underscores"),
  value: z.string().min(1, "Value is required"),
});

// SettingsManagement component
const SettingsManagement = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [isCreatingSetting, setIsCreatingSetting] = useState<boolean>(false);
  const { toast } = useToast();
  
  const form = useForm<EditingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: '',
      value: '',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);
  
  useEffect(() => {
    if (editingSetting) {
      form.reset({
        key: editingSetting.key,
        value: JSON.stringify(editingSetting.value, null, 2)
      });
    } else if (isCreatingSetting) {
      form.reset({
        key: '',
        value: '{}'
      });
    }
  }, [editingSetting, isCreatingSetting, form]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('system_settings' as any)
        .select('*')
        .order('key', { ascending: true }) as any);

      if (error) throw error;
      
      if (data) {
        setSettings(castTo<SystemSetting[]>(data));
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSetting(null);
    setIsCreatingSetting(false);
    form.reset();
  };

  const openEditDialog = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setIsCreatingSetting(false);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setIsCreatingSetting(true);
    setEditingSetting(null);
    setIsDialogOpen(true);
  };

  const handleSaveSetting = async (values: EditingFormValues) => {
    let parsedValue: any;
    
    try {
      parsedValue = JSON.parse(values.value);
    } catch (error) {
      form.setError('value', {
        type: 'manual',
        message: 'Invalid JSON format'
      });
      return;
    }
    
    try {
      if (isCreatingSetting) {
        // Check if key already exists
        const { data } = await (supabase
          .from('system_settings' as any)
          .select('id')
          .eq('key', values.key) as any);
          
        if (data && data.length > 0) {
          form.setError('key', {
            type: 'manual',
            message: 'This key already exists'
          });
          return;
        }
        
        const { error } = await (supabase
          .from('system_settings' as any)
          .insert({
            key: values.key,
            value: parsedValue,
          }) as any);
          
        if (error) throw error;
        
        toast({
          title: 'Setting Created',
          description: 'The setting has been added successfully',
        });
      } else if (editingSetting) {
        const { error } = await (supabase
          .from('system_settings' as any)
          .update({
            value: parsedValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSetting.id) as any);
          
        if (error) throw error;
        
        toast({
          title: 'Setting Updated',
          description: 'The setting has been updated successfully',
        });
      }
      
      closeDialog();
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save setting',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSetting = async (setting: SystemSetting) => {
    // Prevent deletion of core settings
    const protectedSettings = ['email_templates', 'shipping_rates', 'system_notifications'];
    if (protectedSettings.includes(setting.key)) {
      toast({
        title: 'Cannot Delete',
        description: 'This is a core system setting and cannot be deleted',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await (supabase
        .from('system_settings' as any)
        .delete()
        .eq('id', setting.id) as any);
        
      if (error) throw error;
      
      toast({
        title: 'Setting Deleted',
        description: 'The setting has been deleted successfully',
      });
      
      fetchSettings();
    } catch (error: any) {
      console.error('Error deleting setting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete setting',
        variant: 'destructive',
      });
    }
  };

  const formatValue = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return typeof value === 'string' ? value : 'Invalid format';
    }
  };

  const filteredSettings = settings.filter(setting => 
    setting.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">System Settings</CardTitle>
              <CardDescription>Manage application configuration</CardDescription>
            </div>
            <Button 
              onClick={openCreateDialog}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Setting
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search settings..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline"
              onClick={fetchSettings}
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
          ) : filteredSettings.length === 0 ? (
            <div className="text-center p-12">
              <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No settings found</h3>
              <p className="text-gray-500">
                {searchQuery ? "Try adjusting your search" : "There are no settings in the system yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettings.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell className="font-medium">
                        {setting.key}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-sm truncate">
                        {formatValue(setting.value).length > 100 
                          ? formatValue(setting.value).substring(0, 100) + '...' 
                          : formatValue(setting.value)}
                      </TableCell>
                      <TableCell>
                        {new Date(setting.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(setting)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSetting(setting)}
                            disabled={['email_templates', 'shipping_rates', 'system_notifications'].includes(setting.key)}
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {isCreatingSetting ? 'Add New Setting' : 'Edit Setting'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingSetting 
                ? 'Create a new application setting.' 
                : `Update the value for "${editingSetting?.key}".`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveSetting)} className="space-y-6">
              {isCreatingSetting && (
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setting Key</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g. notification_settings"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value (JSON format)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        rows={10} 
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button className="bg-zim-green hover:bg-zim-green/90" type="submit">
                  {isCreatingSetting ? 'Create Setting' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsManagement;
