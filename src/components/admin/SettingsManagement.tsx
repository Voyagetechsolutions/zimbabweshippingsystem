
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SystemSetting } from '@/types/admin';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Settings } from "lucide-react";

// Validation schema for settings form
const settingsFormSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  support_email: z.string().email("Must be a valid email"),
  maintenance_mode: z.boolean().default(false),
  max_file_size: z.coerce.number().min(1, "Must be greater than 0"),
  tracking_enabled: z.boolean().default(true),
  base_shipping_rate: z.coerce.number().min(0, "Must be 0 or greater"),
  weight_price_factor: z.coerce.number().min(0, "Must be 0 or greater"),
});

const SettingsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      company_name: "Zimbabwe Shipping",
      support_email: "support@zimbabweshipping.com",
      maintenance_mode: false,
      max_file_size: 10,
      tracking_enabled: true,
      base_shipping_rate: 20,
      weight_price_factor: 0.5,
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch all settings from the system_settings table
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const settingsMap: Record<string, any> = {};
        
        // Process the settings into a map of key to value
        data.forEach((setting: SystemSetting) => {
          if (typeof setting.value === 'object' && setting.value !== null) {
            settingsMap[setting.key] = setting.value as any;
          } else {
            settingsMap[setting.key] = setting.value;
          }
        });
        
        // Update the form with values from the database
        form.reset({
          company_name: settingsMap.company_name || "Zimbabwe Shipping",
          support_email: settingsMap.support_email || "support@zimbabweshipping.com",
          maintenance_mode: settingsMap.maintenance_mode || false,
          max_file_size: settingsMap.max_file_size || 10,
          tracking_enabled: settingsMap.tracking_enabled || true,
          base_shipping_rate: settingsMap.base_shipping_rate || 20,
          weight_price_factor: settingsMap.weight_price_factor || 0.5,
        });
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

  const onSubmit = async (values: z.infer<typeof settingsFormSchema>) => {
    setSaving(true);
    try {
      // Convert the form values to an array of upsert operations
      const updates = Object.entries(values).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));
      
      // Perform the upsert operation
      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: update.key,
            value: update.value,
            updated_at: update.updated_at
          }, {
            onConflict: 'key'
          });
        
        if (error) throw error;
      }
      
      toast({
        title: 'Settings saved',
        description: 'System settings have been updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save system settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <div>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure application settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Accordion type="single" collapsible className="w-full" defaultValue="general">
                <AccordionItem value="general">
                  <AccordionTrigger className="text-lg font-medium">
                    General Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            This will appear in emails, receipts and the website header
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="support_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormDescription>
                            Customer support emails will be sent to this address
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maintenance_mode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Maintenance Mode
                            </FormLabel>
                            <FormDescription>
                              When enabled, the site will show a maintenance page to all non-admin users
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="shipping">
                  <AccordionTrigger className="text-lg font-medium">
                    Shipping Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="base_shipping_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Shipping Rate (£)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" />
                          </FormControl>
                          <FormDescription>
                            Base rate applied to all shipments before weight calculations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="weight_price_factor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight Price Factor (£ per kg)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" />
                          </FormControl>
                          <FormDescription>
                            Amount to multiply by weight (in kg) to calculate additional cost
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tracking_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Shipment Tracking
                            </FormLabel>
                            <FormDescription>
                              Allow customers to track their shipments with tracking numbers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="upload">
                  <AccordionTrigger className="text-lg font-medium">
                    Upload Settings
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="max_file_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max File Size (MB)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" />
                          </FormControl>
                          <FormDescription>
                            Maximum size for file uploads in megabytes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-zim-green hover:bg-zim-green/90">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsManagement;
