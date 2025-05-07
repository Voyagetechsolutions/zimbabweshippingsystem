import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { isValidEmail, isValidPhoneNumber } from '@/utils/formValidation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Package, Ship, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define the validation schema
const formSchema = z.object({
  // Sender Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().refine(val => isValidPhoneNumber(val), {
    message: 'Please enter a valid phone number',
  }),
  additionalPhone: z.string().optional(),
  pickupCountry: z.enum(['England', 'Ireland']),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  pickupPostcode: z.string()
    .min(1, 'Postcode is required')
    .refine(val => {
      // UK Postcode validation: 2 letters + 1 number OR 1 letter + 1 number
      return /^[A-Z]{1,2}[0-9]/.test(val.toUpperCase());
    }, { message: 'Please enter a valid UK postcode' }),
  pickupCity: z.string().min(1, 'City is required'),
  
  // Collection Information
  collectionRoute: z.string().min(1, 'Please select a collection route'),
  collectionDate: z.string().min(1, 'Collection date is required'),
  
  // Recipient Information
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientPhone: z.string().refine(val => isValidPhoneNumber(val), {
    message: 'Please enter a valid phone number',
  }),
  additionalRecipientPhone: z.string().optional(),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  deliveryCity: z.string().min(1, 'Delivery city is required'),
  
  // Shipment Details
  includeDrums: z.boolean().default(false),
  includeOtherItems: z.boolean().default(false),
  drumQuantity: z.string().optional(),
  shipmentType: z.enum(['drum', 'parcel', 'other']).default('drum'),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  itemCategory: z.string().optional(),
  specificItem: z.string().optional(),
  otherItemDescription: z.string().optional(),
  
  // Additional Services
  doorToDoor: z.boolean().default(false),
  wantMetalSeal: z.boolean().default(false),
  additionalDeliveryAddresses: z.array(z.string()).optional(),
  
  // Payment Options
  paymentOption: z.enum(['standard', 'payLater']).default('standard'),
  paymentMethod: z.enum(['card', 'bank', 'crypto']).default('card'),
});

type FormValues = z.infer<typeof formSchema>;

interface BookingFormNewProps {
  onSubmitComplete: (data: any, shipmentId: string, amount: number) => void;
}

const BookingFormNew: React.FC<BookingFormNewProps> = ({ onSubmitComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('sender');
  const [availableRoutes, setAvailableRoutes] = useState<{ route: string; pickupDate: string }[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupCountry: 'England',
      includeDrums: true,
      includeOtherItems: false,
      shipmentType: 'drum',
      drumQuantity: '1',
      doorToDoor: false,
      wantMetalSeal: false,
      additionalDeliveryAddresses: [],
      paymentOption: 'standard',
      paymentMethod: 'card',
    },
  });

  // Fetch collection schedules
  React.useEffect(() => {
    const fetchCollectionSchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('collection_schedules')
          .select('route, pickup_date, areas');
        
        if (error) throw error;
        
        if (data) {
          setAvailableRoutes(data.map(item => ({
            route: item.route,
            pickupDate: item.pickup_date
          })));
        }
      } catch (error) {
        console.error('Error fetching collection schedules:', error);
        toast({
          title: 'Error',
          description: 'Failed to load collection schedules',
          variant: 'destructive',
        });
      }
    };
    
    fetchCollectionSchedules();
  }, [toast]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    
    try {
      // Calculate the base price based on the shipment details
      let basePrice = 0;
      
      if (values.includeDrums) {
        const qty = parseInt(values.drumQuantity || '1');
        
        if (values.paymentOption === 'standard') {
          // Standard payment prices
          if (qty >= 5) {
            basePrice = qty * 220;
          } else if (qty >= 2) {
            basePrice = qty * 240;
          } else {
            basePrice = 260;
          }
        } else {
          // Pay later prices
          if (qty >= 5) {
            basePrice = qty * 250;
          } else if (qty >= 2) {
            basePrice = qty * 270;
          } else {
            basePrice = 280;
          }
        }
      }
      
      // Generate tracking number
      const trackingNumber = `ZIMSHIP-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Create shipment record
      const shipment = {
        id: uuidv4(),
        tracking_number: trackingNumber,
        status: 'pending',
        origin: `${values.pickupAddress}, ${values.pickupCity}, ${values.pickupPostcode}, ${values.pickupCountry}`,
        destination: `${values.deliveryAddress}, ${values.deliveryCity}, Zimbabwe`,
        user_id: null, // Will be populated if user is logged in
        metadata: {
          sender: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            additionalPhone: values.additionalPhone,
            country: values.pickupCountry,
            address: values.pickupAddress,
            postcode: values.pickupPostcode,
            city: values.pickupCity,
          },
          recipient: {
            name: values.recipientName,
            phone: values.recipientPhone,
            additionalPhone: values.additionalRecipientPhone,
            address: values.deliveryAddress,
            city: values.deliveryCity,
          },
          shipment: {
            includeDrums: values.includeDrums,
            includeOtherItems: values.includeOtherItems,
            type: values.shipmentType,
            quantity: values.includeDrums ? parseInt(values.drumQuantity || '1') : null,
            weight: values.includeOtherItems ? values.weight : null,
            dimensions: values.includeOtherItems ? values.dimensions : null,
            category: values.includeOtherItems ? values.itemCategory : null,
            specificItem: values.includeOtherItems ? values.specificItem : null,
            description: values.includeOtherItems ? values.otherItemDescription : null,
          },
          services: {
            doorToDoor: values.doorToDoor,
            metalSeal: values.wantMetalSeal,
            additionalAddresses: values.additionalDeliveryAddresses,
          },
          collection: {
            route: values.collectionRoute,
            date: values.collectionDate,
          },
          payment: {
            option: values.paymentOption,
            method: values.paymentMethod,
            basePrice: basePrice,
          }
        }
      };
      
      // Get authenticated user if available
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        shipment.user_id = user.id;
      }
      
      // Insert shipment into Supabase
      const { data, error } = await supabase
        .from('shipments')
        .insert(shipment)
        .select()
        .single();
      
      if (error) throw error;
      
      // Call the onSubmitComplete callback with the relevant data
      onSubmitComplete(values, data.id, basePrice);
      
    } catch (error: any) {
      console.error('Error submitting shipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit shipment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md">
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="sender">Sender Info</TabsTrigger>
            <TabsTrigger value="recipient">Recipient Info</TabsTrigger>
            <TabsTrigger value="shipment">Shipment Details</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Sender Information */}
              <TabsContent value="sender" className="space-y-6">
                <div className="text-xl font-semibold mb-4">Sender Information</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="additionalPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Additional phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pickupCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="England">England</SelectItem>
                          <SelectItem value="Ireland">Ireland</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter pickup address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupCity"
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
                    control={form.control}
                    name="pickupPostcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Postal code" 
                            {...field} 
                            onChange={(e) => {
                              // Convert to uppercase for consistent validation
                              field.onChange(e.target.value.toUpperCase());
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Must start with 1-2 letters followed by a number (e.g., SW1 or B1)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="collectionRoute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Route</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Set the corresponding date automatically
                        const selectedRoute = availableRoutes.find(route => route.route === value);
                        if (selectedRoute) {
                          form.setValue('collectionDate', selectedRoute.pickupDate);
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collection route" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRoutes.map((route, index) => (
                            <SelectItem key={index} value={route.route}>
                              {route.route}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="collectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Date</FormLabel>
                      <FormControl>
                        <Input readOnly {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="button"
                    onClick={() => setActiveTab('recipient')}
                  >
                    Next: Recipient Information
                  </Button>
                </div>
              </TabsContent>
              
              {/* Recipient Information */}
              <TabsContent value="recipient" className="space-y-6">
                <div className="text-xl font-semibold mb-4">Recipient Information</div>
                
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="recipientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="additionalRecipientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Additional phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter delivery address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormDescription>
                        We deliver in major towns and cities except rural areas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setActiveTab('sender')}
                  >
                    Back
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setActiveTab('shipment')}
                  >
                    Next: Shipment Details
                  </Button>
                </div>
              </TabsContent>
              
              {/* Shipment Details */}
              <TabsContent value="shipment" className="space-y-6">
                <div className="text-xl font-semibold mb-4">Shipment Details</div>
                
                <div className="space-y-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <div className="font-medium">What would you like to ship?</div>
                  
                  <div className="flex flex-col space-y-4">
                    <FormField
                      control={form.control}
                      name="includeDrums"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            <Ship className="h-4 w-4 mr-2" />
                            Drums (200-220L each)
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="includeOtherItems"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Other Items
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Drums Section */}
                {form.watch('includeDrums') && (
                  <div className="border rounded-md p-4">
                    <div className="font-medium mb-4">Drum Details</div>
                    
                    <FormField
                      control={form.control}
                      name="drumQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Drums</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select quantity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="wantMetalSeal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Add metal seal for security (£5 per drum)
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Other Items Section */}
                {form.watch('includeOtherItems') && (
                  <div className="border rounded-md p-4">
                    <div className="font-medium mb-4">Other Items Details</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="itemCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="electronics">Electronics</SelectItem>
                                <SelectItem value="clothing">Clothing</SelectItem>
                                <SelectItem value="furniture">Furniture</SelectItem>
                                <SelectItem value="documents">Documents</SelectItem>
                                <SelectItem value="food">Food Items</SelectItem>
                                <SelectItem value="building">Building Materials</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="specificItem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specific Item</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Laptop, TV, Sofa" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="otherItemDescription"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Item Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please provide details about your item"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Additional Services Section */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-4">Additional Services</div>
                  
                  <FormField
                    control={form.control}
                    name="doorToDoor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Door-to-Door Delivery (£25)
                          </FormLabel>
                          <FormDescription>
                            We'll pick up from your address and deliver directly to the recipient
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Payment Option Section */}
                <div className="border rounded-md p-4">
                  <div className="font-medium mb-4">Payment Option</div>
                  
                  <FormField
                    control={form.control}
                    name="paymentOption"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="standard" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Discount Deal (Pay Now)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="payLater" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Standard Rate
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setActiveTab('recipient')}
                  >
                    Back
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setActiveTab('payment')}
                  >
                    Next: Payment
                  </Button>
                </div>
              </TabsContent>
              
              {/* Payment Section */}
              <TabsContent value="payment" className="space-y-6">
                <div className="text-xl font-semibold mb-4">Payment Method</div>
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select Payment Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="card" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Credit/Debit Card
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="bank" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Bank Transfer
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="crypto" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Cryptocurrency
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Alert className="bg-gray-50 dark:bg-gray-700">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your payment method will be used to process payment after reviewing your shipment details.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setActiveTab('shipment')}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Submit Booking'}
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BookingFormNew;
