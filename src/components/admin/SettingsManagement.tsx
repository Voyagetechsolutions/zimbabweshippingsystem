
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Mail, Bell, DollarSign, AlertTriangle, RefreshCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

const emailTemplateSchema = z.object({
  welcome: z.string().min(1, "Welcome email template is required"),
  password_reset: z.string().min(1, "Password reset email template is required"),
});

const shippingRatesSchema = z.object({
  standard: z.coerce.number().positive("Standard rate must be positive"),
  express: z.coerce.number().positive("Express rate must be positive"),
  overnight: z.coerce.number().positive("Overnight rate must be positive"),
});

const notificationsSchema = z.object({
  maintenance: z.boolean(),
  maintenance_message: z.string().optional(),
});

const SettingsManagement = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('email');
  const { toast } = useToast();

  const emailForm = useForm<z.infer<typeof emailTemplateSchema>>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      welcome: '',
      password_reset: '',
    },
  });

  const shippingForm = useForm<z.infer<typeof shippingRatesSchema>>({
    resolver: zodResolver(shippingRatesSchema),
    defaultValues: {
      standard: 5.99,
      express: 15.99,
      overnight: 29.99,
    },
  });

  const notificationsForm = useForm<z.infer<typeof notificationsSchema>>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      maintenance: false,
      maintenance_message: '',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.length > 0) {
      populateFormsWithSettings();
    }
  }, [settings]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;
      
      if (data) {
        console.log("Fetched settings:", data);
        setSettings(data as SystemSetting[]);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const populateFormsWithSettings = () => {
    // Find email templates
    const emailTemplates = settings.find(s => s.key === 'email_templates');
    if (emailTemplates && emailTemplates.value) {
      emailForm.reset(emailTemplates.value);
    }

    // Find shipping rates
    const shippingRates = settings.find(s => s.key === 'shipping_rates');
    if (shippingRates && shippingRates.value) {
      shippingForm.reset(shippingRates.value);
    }

    // Find system notifications
    const systemNotifications = settings.find(s => s.key === 'system_notifications');
    if (systemNotifications && systemNotifications.value) {
      notificationsForm.reset(systemNotifications.value);
    }
  };

  const saveEmailSettings = async (data: z.infer<typeof emailTemplateSchema>) => {
    try {
      const emailTemplates = settings.find(s => s.key === 'email_templates');
      
      if (emailTemplates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            value: data,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'email_templates');
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'email_templates',
            value: data
          });
          
        if (error) throw error;
      }
      
      toast({
        title: 'Settings Saved',
        description: 'Email templates have been updated successfully',
      });
      
      fetchSettings(); // Refresh settings
    } catch (error: any) {
      console.error('Error saving email templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email templates',
        variant: 'destructive',
      });
    }
  };

  const saveShippingSettings = async (data: z.infer<typeof shippingRatesSchema>) => {
    try {
      const shippingRates = settings.find(s => s.key === 'shipping_rates');
      
      if (shippingRates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            value: data,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'shipping_rates');
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'shipping_rates',
            value: data
          });
          
        if (error) throw error;
      }
      
      toast({
        title: 'Settings Saved',
        description: 'Shipping rates have been updated successfully',
      });
      
      fetchSettings(); // Refresh settings
    } catch (error: any) {
      console.error('Error saving shipping rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save shipping rates',
        variant: 'destructive',
      });
    }
  };

  const saveNotificationSettings = async (data: z.infer<typeof notificationsSchema>) => {
    try {
      const systemNotifications = settings.find(s => s.key === 'system_notifications');
      
      if (systemNotifications) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            value: data,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'system_notifications');
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'system_notifications',
            value: data
          });
          
        if (error) throw error;
      }
      
      toast({
        title: 'Settings Saved',
        description: 'System notifications have been updated successfully',
      });
      
      fetchSettings(); // Refresh settings
    } catch (error: any) {
      console.error('Error saving system notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to save system notifications',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">System Settings</CardTitle>
              <CardDescription>Configure application settings</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchSettings} 
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Templates</span>
                </TabsTrigger>
                <TabsTrigger value="shipping" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Shipping Rates</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>System Notifications</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Email Templates Tab */}
              <TabsContent value="email">
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(saveEmailSettings)} className="space-y-6">
                    <FormField
                      control={emailForm.control}
                      name="welcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Welcome Email Template</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter the welcome email template"
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This template is used when new users sign up.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={emailForm.control}
                      name="password_reset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password Reset Template</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter the password reset email template"
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This template is used when users request a password reset.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="bg-zim-green hover:bg-zim-green/90"
                      disabled={emailForm.formState.isSubmitting}
                    >
                      Save Email Templates
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Shipping Rates Tab */}
              <TabsContent value="shipping">
                <Form {...shippingForm}>
                  <form onSubmit={shippingForm.handleSubmit(saveShippingSettings)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={shippingForm.control}
                        name="standard"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Standard Shipping Rate ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="5.99"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Base rate for standard shipping.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={shippingForm.control}
                        name="express"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Express Shipping Rate ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="15.99"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Base rate for express shipping.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={shippingForm.control}
                        name="overnight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overnight Shipping Rate ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="29.99"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Base rate for overnight shipping.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="bg-zim-green hover:bg-zim-green/90"
                      disabled={shippingForm.formState.isSubmitting}
                    >
                      Save Shipping Rates
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* System Notifications Tab */}
              <TabsContent value="notifications">
                <Form {...notificationsForm}>
                  <form onSubmit={notificationsForm.handleSubmit(saveNotificationSettings)} className="space-y-6">
                    <FormField
                      control={notificationsForm.control}
                      name="maintenance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              <div className="flex items-center">
                                <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                                Maintenance Mode
                              </div>
                            </FormLabel>
                            <FormDescription>
                              Enable maintenance mode to notify users about system maintenance.
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
                    
                    {notificationsForm.watch("maintenance") && (
                      <FormField
                        control={notificationsForm.control}
                        name="maintenance_message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintenance Message</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter maintenance message to display to users"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This message will be displayed to users during maintenance mode.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <Button 
                      type="submit" 
                      className="bg-zim-green hover:bg-zim-green/90"
                      disabled={notificationsForm.formState.isSubmitting}
                    >
                      Save Notification Settings
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsManagement;
