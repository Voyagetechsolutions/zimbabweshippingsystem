
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Building, 
  CreditCard, 
  MapPin, 
  Mail,
  Save,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';

// Define form schemas
const companyInfoSchema = z.object({
  company_name: z.string().min(2, { message: "Company name is required" }),
  address_line1: z.string().min(2, { message: "Address is required" }),
  address_line2: z.string().optional(),
  city: z.string().min(2, { message: "City is required" }),
  postal_code: z.string().min(1, { message: "Postal code is required" }),
  country: z.string().min(2, { message: "Country is required" }),
  phone: z.string().min(5, { message: "Phone number is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  website: z.string().url({ message: "Invalid website URL" }).optional(),
  registration_number: z.string().optional(),
  vat_number: z.string().optional(),
});

const paymentMethodSchema = z.object({
  gbp_to_usd: z.coerce.number().positive({ message: "Rate must be positive" }),
  standard_payment: z.boolean(),
  cash_on_collection: z.boolean(),
  cash_on_delivery: z.boolean(),
  bank_transfer: z.boolean(),
  paypal_email: z.string().email({ message: "Invalid PayPal email" }).optional(),
  stripe_enabled: z.boolean(),
});

// Define types
interface SystemSetting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

interface PickupZone {
  id: string;
  name: string;
  postal_codes: string[];
  is_active: boolean;
  pricing_tier: string;
}

const SystemSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('company');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [pickupZones, setPickupZones] = useState<PickupZone[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<Record<string, string>>({
    'welcome': 'Welcome to Zimbabwe Shipping! We\'re delighted to have you on board.',
    'shipment_confirmation': 'Your shipment #{tracking_number} has been confirmed.',
    'pickup_scheduled': 'Your collection has been scheduled for {date}.',
    'payment_received': 'Thank you for your payment of {amount} for shipment #{tracking_number}.',
    'delivery_notification': 'Your shipment #{tracking_number} is out for delivery.',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [templateContent, setTemplateContent] = useState<string>('');
  
  // Set up forms
  const companyForm = useForm<z.infer<typeof companyInfoSchema>>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      company_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      postal_code: '',
      country: '',
      phone: '',
      email: '',
      website: '',
      registration_number: '',
      vat_number: '',
    }
  });
  
  const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      gbp_to_usd: 1.25,
      standard_payment: true,
      cash_on_collection: true,
      cash_on_delivery: true,
      bank_transfer: false,
      paypal_email: '',
      stripe_enabled: true,
    }
  });

  useEffect(() => {
    fetchSettings();
    fetchPickupZones();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateContent(emailTemplates[selectedTemplate] || '');
    }
  }, [selectedTemplate, emailTemplates]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // In a real implementation, fetch from Supabase
      // For demo purposes, using mock data
      const mockSettings = {
        company_info: {
          company_name: 'Zimbabwe Shipping Ltd',
          address_line1: '123 Main Street',
          address_line2: 'Suite 456',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom',
          phone: '+44 20 1234 5678',
          email: 'info@zimbabweshipping.com',
          website: 'https://zimbabweshipping.com',
          registration_number: '12345678',
          vat_number: 'GB123456789',
        },
        payment_settings: {
          gbp_to_usd: 1.25,
          standard_payment: true,
          cash_on_collection: true,
          cash_on_delivery: true,
          bank_transfer: false,
          paypal_email: 'payments@zimbabweshipping.com',
          stripe_enabled: true,
        }
      };
      
      setSettings(mockSettings);
      companyForm.reset(mockSettings.company_info);
      paymentForm.reset(mockSettings.payment_settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPickupZones = async () => {
    try {
      // In a real implementation, fetch from Supabase
      // For demo purposes, using mock data
      const mockZones: PickupZone[] = [
        {
          id: '1',
          name: 'London Central',
          postal_codes: ['W1', 'W2', 'EC1', 'EC2', 'SW1'],
          is_active: true,
          pricing_tier: 'standard'
        },
        {
          id: '2',
          name: 'London North',
          postal_codes: ['N1', 'N2', 'N3', 'NW1', 'NW2'],
          is_active: true,
          pricing_tier: 'standard'
        },
        {
          id: '3',
          name: 'London South',
          postal_codes: ['SE1', 'SE2', 'SW2', 'SW3'],
          is_active: true,
          pricing_tier: 'standard'
        },
        {
          id: '4',
          name: 'Birmingham',
          postal_codes: ['B1', 'B2', 'B3', 'B4'],
          is_active: true,
          pricing_tier: 'premium'
        }
      ];
      
      setPickupZones(mockZones);
    } catch (error) {
      console.error('Error fetching pickup zones:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pickup zones',
        variant: 'destructive'
      });
    }
  };

  const saveCompanyInfo = async (data: z.infer<typeof companyInfoSchema>) => {
    try {
      // In production, save to Supabase
      // For demo purposes, just updating state
      setSettings({
        ...settings,
        company_info: data
      });
      
      toast({
        title: 'Settings saved',
        description: 'Company information has been updated'
      });
    } catch (error) {
      console.error('Error saving company info:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company information',
        variant: 'destructive'
      });
    }
  };

  const savePaymentSettings = async (data: z.infer<typeof paymentMethodSchema>) => {
    try {
      // In production, save to Supabase
      // For demo purposes, just updating state
      setSettings({
        ...settings,
        payment_settings: data
      });
      
      toast({
        title: 'Settings saved',
        description: 'Payment settings have been updated'
      });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment settings',
        variant: 'destructive'
      });
    }
  };

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setTemplateContent(emailTemplates[templateKey] || '');
  };

  const saveEmailTemplate = () => {
    if (selectedTemplate) {
      setEmailTemplates({
        ...emailTemplates,
        [selectedTemplate]: templateContent
      });
      
      toast({
        title: 'Template saved',
        description: 'Email template has been updated'
      });
    }
  };

  const toggleZoneStatus = (zoneId: string) => {
    setPickupZones(zones =>
      zones.map(zone =>
        zone.id === zoneId
          ? { ...zone, is_active: !zone.is_active }
          : zone
      )
    );
    
    toast({
      title: 'Zone updated',
      description: 'Pickup zone status has been toggled'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure system settings and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
          </div>
        ) : (
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company Info
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </TabsTrigger>
              <TabsTrigger value="zones" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pickup Zones
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Templates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="company">
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(saveCompanyInfo)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={companyForm.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="address_line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="address_line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Suite, unit, etc. (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Postal code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="Website URL (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="registration_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Registration number (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="vat_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="VAT number (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-4">
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => companyForm.reset(settings.company_info)}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="payment">
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(savePaymentSettings)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <FormField
                        control={paymentForm.control}
                        name="gbp_to_usd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GBP to USD Exchange Rate</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormDescription>
                              The current exchange rate used for USD payments
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="border p-4 rounded-lg">
                      <h3 className="text-md font-medium mb-4">Payment Methods</h3>
                      <div className="space-y-4">
                        <FormField
                          control={paymentForm.control}
                          name="standard_payment"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <FormLabel className="cursor-pointer">Standard Payment</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={paymentForm.control}
                          name="cash_on_collection"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <FormLabel className="cursor-pointer">Cash on Collection</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={paymentForm.control}
                          name="cash_on_delivery"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <FormLabel className="cursor-pointer">Cash on Delivery</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={paymentForm.control}
                          name="bank_transfer"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <FormLabel className="cursor-pointer">Bank Transfer</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="border p-4 rounded-lg">
                      <h3 className="text-md font-medium mb-4">Online Payment Processors</h3>
                      <div className="space-y-4">
                        <FormField
                          control={paymentForm.control}
                          name="stripe_enabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel className="cursor-pointer">Stripe</FormLabel>
                                <FormDescription>
                                  Process credit card payments securely
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
                        
                        <div className="pt-4 border-t">
                          <FormField
                            control={paymentForm.control}
                            name="paypal_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PayPal Business Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="PayPal email address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4">
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => paymentForm.reset(settings.payment_settings)}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="zones">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Pickup Zones</h3>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Zone
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Zone Name</th>
                        <th className="text-left py-3 px-4">Postal Codes</th>
                        <th className="text-left py-3 px-4">Pricing Tier</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickupZones.map((zone) => (
                        <tr key={zone.id} className="border-b">
                          <td className="py-3 px-4">{zone.name}</td>
                          <td className="py-3 px-4">{zone.postal_codes.join(', ')}</td>
                          <td className="py-3 px-4 capitalize">{zone.pricing_tier}</td>
                          <td className="py-3 px-4">
                            <Switch
                              checked={zone.is_active}
                              onCheckedChange={() => toggleZoneStatus(zone.id)}
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Pickup Zone Notes</h4>
                      <p className="text-sm text-amber-700">
                        Changes to pickup zones will only affect new bookings. Existing bookings will maintain their current zone assignment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="email">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Email Templates</h3>
                  <div className="border rounded-md">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="customer">
                        <AccordionTrigger className="px-4">Customer Emails</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 px-4 pb-4">
                            <Button
                              variant={selectedTemplate === 'welcome' ? 'default' : 'outline'}
                              className="w-full justify-start"
                              onClick={() => handleTemplateChange('welcome')}
                            >
                              Welcome Email
                            </Button>
                            <Button
                              variant={selectedTemplate === 'shipment_confirmation' ? 'default' : 'outline'}
                              className="w-full justify-start"
                              onClick={() => handleTemplateChange('shipment_confirmation')}
                            >
                              Shipment Confirmation
                            </Button>
                            <Button
                              variant={selectedTemplate === 'pickup_scheduled' ? 'default' : 'outline'}
                              className="w-full justify-start"
                              onClick={() => handleTemplateChange('pickup_scheduled')}
                            >
                              Pickup Scheduled
                            </Button>
                            <Button
                              variant={selectedTemplate === 'payment_received' ? 'default' : 'outline'}
                              className="w-full justify-start"
                              onClick={() => handleTemplateChange('payment_received')}
                            >
                              Payment Received
                            </Button>
                            <Button
                              variant={selectedTemplate === 'delivery_notification' ? 'default' : 'outline'}
                              className="w-full justify-start"
                              onClick={() => handleTemplateChange('delivery_notification')}
                            >
                              Delivery Notification
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="admin">
                        <AccordionTrigger className="px-4">Admin Notifications</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 px-4 pb-4">
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              New Shipment Alert
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              Quote Request
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              Support Ticket
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Template Editor</h3>
                    <Button onClick={saveEmailTemplate}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                  </div>
                  
                  {selectedTemplate ? (
                    <div className="space-y-4">
                      <Input 
                        value={templateContent} 
                        onChange={(e) => setTemplateContent(e.target.value)}
                        placeholder="Email subject line"
                        className="font-medium"
                      />
                      <Textarea 
                        value={templateContent} 
                        onChange={(e) => setTemplateContent(e.target.value)}
                        placeholder="Email content..."
                        className="min-h-[300px] font-mono text-sm"
                      />
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium mb-2">Available Variables</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">{'{{customer_name}}'}</div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">{'{{tracking_number}}'}</div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">{'{{date}}'}</div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">{'{{amount}}'}</div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">{'{{company_name}}'}</div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">{'{{contact_email}}'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-md flex items-center justify-center p-12">
                      <p className="text-gray-400">Select a template to edit</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemSettingsTab;
