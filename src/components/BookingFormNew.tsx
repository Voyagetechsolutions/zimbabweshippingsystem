import React, { useState, useEffect } from 'react';
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
import { AlertCircle, CheckCircle2, Package, Ship, Info, User, Phone, FileBox, ClipboardList } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRouteForPostalCode, getIrelandRouteForCity, restrictedPostalCodes } from '@/utils/postalCodeUtils';
import { useIsMobile } from '@/hooks/use-mobile';

// Define the validation schema
const formSchema = z.object({
  // Sender Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().refine(val => isValidPhoneNumber(val), {
    message: 'Please enter a valid phone number',
  }),
  hasAdditionalPhone: z.boolean().default(false),
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
  collectionRoute: z.string().optional(),
  collectionDate: z.string().optional(),
  
  // Recipient Information
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientPhone: z.string().refine(val => isValidPhoneNumber(val), {
    message: 'Please enter a valid phone number',
  }),
  hasAdditionalRecipientPhone: z.boolean().default(false),
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
  onRequestCustomQuote?: () => void; // Add new prop for custom quote request
}

const BookingFormNew: React.FC<BookingFormNewProps> = ({ onSubmitComplete, onRequestCustomQuote }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('sender');
  const [availableRoutes, setAvailableRoutes] = useState<{ route: string; pickupDate: string }[]>([]);
  const [detectedRoute, setDetectedRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [additionalAddresses, setAdditionalAddresses] = useState<string[]>(['']);
  const [isRestrictedPostcode, setIsRestrictedPostcode] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupCountry: 'England',
      includeDrums: false,
      includeOtherItems: false,
      shipmentType: 'drum',
      drumQuantity: '1',
      doorToDoor: false,
      wantMetalSeal: false,
      hasAdditionalPhone: false,
      hasAdditionalRecipientPhone: false,
      additionalDeliveryAddresses: [],
      paymentOption: 'standard',
      paymentMethod: 'card',
    },
  });

  // Fetch collection schedules
  useEffect(() => {
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
  
  // Watch for postcode changes to calculate route
  const watchPostcode = form.watch('pickupPostcode');
  const watchCountry = form.watch('pickupCountry');
  const watchPickupCity = form.watch('pickupCity');
  
  useEffect(() => {
    if (watchCountry === 'England' && watchPostcode) {
      // Check if this is a restricted postal code
      const postCodePrefix = watchPostcode.toUpperCase().match(/^[A-Z]{1,2}/)?.[0];
      const isRestricted = postCodePrefix && restrictedPostalCodes.includes(postCodePrefix);
      
      setIsRestrictedPostcode(isRestricted);
      
      if (isRestricted) {
        toast({
          title: "Contact Support",
          description: "Please contact +44 7584 100552 to place a booking manually. We currently don't have a schedule for this route unless manually booking.",
          variant: "destructive"
        });
        return;
      }
      
      const route = getRouteForPostalCode(watchPostcode);
      setDetectedRoute(route);
      
      if (route) {
        const matchingRoute = availableRoutes.find(item => item.route === route);
        if (matchingRoute) {
          setCollectionDate(matchingRoute.pickupDate);
          form.setValue('collectionRoute', route);
          form.setValue('collectionDate', matchingRoute.pickupDate);
        }
      }
    } else if (watchCountry === 'Ireland' && watchPickupCity) {
      setIsRestrictedPostcode(false);
      
      const route = getIrelandRouteForCity(watchPickupCity);
      setDetectedRoute(route);
      
      if (route) {
        const matchingRoute = availableRoutes.find(item => item.route === route);
        if (matchingRoute) {
          setCollectionDate(matchingRoute.pickupDate);
          form.setValue('collectionRoute', route);
          form.setValue('collectionDate', matchingRoute.pickupDate);
        }
      }
    }
  }, [watchPostcode, watchCountry, watchPickupCity, availableRoutes, form, toast]);
  
  // Handle adding/removing additional delivery addresses
  const addDeliveryAddress = () => {
    setAdditionalAddresses([...additionalAddresses, '']);
  };
  
  const removeDeliveryAddress = (index: number) => {
    const newAddresses = [...additionalAddresses];
    newAddresses.splice(index, 1);
    setAdditionalAddresses(newAddresses);
  };
  
  const updateDeliveryAddress = (index: number, value: string) => {
    const newAddresses = [...additionalAddresses];
    newAddresses[index] = value;
    setAdditionalAddresses(newAddresses);
    form.setValue('additionalDeliveryAddresses', newAddresses.filter(addr => addr.trim() !== ''));
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    // Prevent submission if postcode is restricted
    if (isRestrictedPostcode) {
      toast({
        title: "Booking Unavailable",
        description: "Please contact +44 7584 100552 to place a booking manually for this postal code area.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Calculate the base price based on the shipment details
      let basePrice = 0;
      
      if (values.includeDrums) {
        const qty = parseInt(values.drumQuantity || '1');
        
        if (values.paymentOption === 'standard') {
          // Standard payment prices
          if (qty >= 5) {
            basePrice = qty * 260;
          } else if (qty >= 2) {
            basePrice = qty * 270;
          } else {
            basePrice = 280;
          }
        } else {
          // Pay later prices
          if (qty >= 5) {
            basePrice = qty * 260;
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
            additionalPhone: values.hasAdditionalPhone ? values.additionalPhone : null,
            country: values.pickupCountry,
            address: values.pickupAddress,
            postcode: values.pickupPostcode,
            city: values.pickupCity,
          },
          recipient: {
            name: values.recipientName,
            phone: values.recipientPhone,
            additionalPhone: values.hasAdditionalRecipientPhone ? values.additionalRecipientPhone : null,
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
            additionalAddresses: values.additionalDeliveryAddresses?.filter(addr => addr.trim() !== '') || [],
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

  // Calculate total cost for the booking summary
  const calculateTotal = () => {
    const values = form.getValues();
    let total = 0;
    
    // Calculate drum cost
    if (values.includeDrums) {
      const qty = parseInt(values.drumQuantity || '1');
      if (values.paymentOption === 'standard') {
        if (qty >= 5) {
          total += qty * 260;
        } else if (qty >= 2) {
          total += qty * 270;
        } else {
          total += 280;
        }
      } else {
        if (qty >= 5) {
          total += qty * 260;
        } else if (qty >= 2) {
          total += qty * 270;
        } else {
          total += 280;
        }
      }
      
      // Add metal seal cost
      if (values.wantMetalSeal) {
        total += 5 * qty;
      }
    }
    
    // Add door-to-door delivery cost
    if (values.doorToDoor) {
      const addressCount = (additionalAddresses.filter(addr => addr.trim() !== '').length || 1);
      total += 25 * addressCount;
    }
    
    return total;
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md">
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="sender" className="flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              {!isMobile && <span>Sender Info</span>}
            </TabsTrigger>
            <TabsTrigger value="recipient" className="flex items-center justify-center gap-2">
              <Phone className="h-4 w-4" />
              {!isMobile && <span>Receiver Info</span>}
            </TabsTrigger>
            <TabsTrigger value="shipment" className="flex items-center justify-center gap-2">
              <Package className="h-4 w-4" />
              {!isMobile && <span>Shipment Details</span>}
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center justify-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {!isMobile && <span>Booking Summary</span>}
            </TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Sender Information */}
              <TabsContent value="sender" className="space-y-6">
                <div className="text-xl font-semibold mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  {!isMobile && <span>Sender Information</span>}
                </div>
                
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
                  name="hasAdditionalPhone"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Add additional phone number</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch('hasAdditionalPhone') && (
                  <FormField
                    control={form.control}
                    name="additionalPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Additional phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
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
                
                {detectedRoute && !isRestrictedPostcode && (
                  <div className="border rounded-md p-4 bg-gray-50">
                    <h3 className="font-medium mb-2">Collection Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Route:</span> {detectedRoute}
                      </div>
                      <div>
                        <span className="font-medium">Collection Date:</span> {collectionDate || "Not available"}
                      </div>
                    </div>
                  </div>
                )}
                
                {isRestrictedPostcode && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-700">
                      Please contact +44 7584 100552 to place a booking manually. We currently don't have a schedule for this route unless manually booking.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    type="button"
                    onClick={() => setActiveTab('recipient')}
                    disabled={isRestrictedPostcode}
                  >
                    Next: Receiver Information
                  </Button>
                </div>
              </TabsContent>
              
              {/* Recipient Information */}
              <TabsContent value="recipient" className="space-y-6">
                <div className="text-xl font-semibold mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  {!isMobile && <span>Receiver Information</span>}
                </div>
                
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
                  name="hasAdditionalRecipientPhone"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Add additional phone number</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch('hasAdditionalRecipientPhone') && (
                  <FormField
                    control={form.control}
                    name="additionalRecipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Additional phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
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
                    disabled={isRestrictedPostcode}
                  >
                    Next: Shipment Details
                  </Button>
                </div>
              </TabsContent>
              
              {/* Shipment Details */}
              <TabsContent value="shipment" className="space-y-6">
                <div className="text-xl font-semibold mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  {!isMobile && <span>Shipment Details</span>}
                </div>
                
                <div className="space-y-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <div className="font-medium">What would you like to ship?</div>
                  <p className="text-gray-600 dark:text-gray-400">Please select either Drums or Other Items or both.</p>
                  
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
                          <FormControl>
                            <Input 
                              type="number"
                              min="1"
                              placeholder="Enter quantity" 
                              {...field}
                            />
                          </FormControl>
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
                            Add Metal coded seal for security (£5 per drum)
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="doorToDoor"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">
                              Door-to-Door Delivery (£25 per delivery address)
                            </FormLabel>
                            <FormDescription>
                              We'll pick up from your address and deliver directly to the recipient
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('doorToDoor') && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <div className="font-medium">Delivery Addresses</div>
                        {additionalAddresses.map((address, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Textarea 
                              value={address}
                              onChange={(e) => updateDeliveryAddress(index, e.target.value)}
                              placeholder={`Delivery address ${index + 1}`}
                              className="flex-grow"
                            />
                            {index > 0 && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => removeDeliveryAddress(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={addDeliveryAddress}
                          className="mt-2"
                        >
                          Add Another Address
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Other Items Section */}
                {form.watch('includeOtherItems') && (
                  <div className="border rounded-md p-4">
                    <div className="font-medium mb-4">Other Items Details</div>
                    
                    <div className="space-y-4">
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
                                Door-to-Door Delivery (£25 per delivery address)
                              </FormLabel>
                              <FormDescription>
                                We'll pick up from your address and deliver directly to the recipient
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch('doorToDoor') && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          <div className="font-medium">Delivery Addresses</div>
                          {additionalAddresses.map((address, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Textarea 
                                value={address}
                                onChange={(e) => updateDeliveryAddress(index, e.target.value)}
                                placeholder={`Delivery address ${index + 1}`}
                                className="flex-grow"
                              />
                              {index > 0 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeDeliveryAddress(index)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          ))}
                          
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={addDeliveryAddress}
                            className="mt-2"
                          >
                            Add Another Address
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex flex-col space-y-4">
                        <Button 
                          className="w-full" 
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            if (onRequestCustomQuote) {
                              onRequestCustomQuote();
                            }
                          }}
                        >
                          Request Custom Quote for Other Items
                        </Button>
                        
                        <Button
                          type="button"
                          variant="link"
                          className="text-blue-600 hover:underline text-center"
                          onClick={() => window.open('/pricing', '_blank')}
                        >
                          View Items We Ship
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
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
                    disabled={isRestrictedPostcode}
                  >
                    Next: Booking Summary
                  </Button>
                </div>
              </TabsContent>
              
              {/* Booking Summary Section */}
              <TabsContent value="payment" className="space-y-6">
                <div className="text-xl font-semibold mb-4 flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2" />
                  {!isMobile && <span>Booking Summary</span>}
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-4">Order Summary</h3>
                  
                  {form.watch('includeDrums') && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Drums ({form.watch('drumQuantity') || '1'} × {
                          parseInt(form.watch('drumQuantity') || '1') >= 5 ? '£260' : 
                          parseInt(form.watch('drumQuantity') || '1') >= 2 ? '£270' : '£280'
                        })</span>
                        <span>£{
                          parseInt(form.watch('drumQuantity') || '1') >= 5 ? 
                            parseInt(form.watch('drumQuantity') || '1') * 260 : 
                          parseInt(form.watch('drumQuantity') || '1') >= 2 ? 
                            parseInt(form.watch('drumQuantity') || '1') * 270 : 280
                        }</span>
                      </div>
                      
                      {form.watch('wantMetalSeal') && (
                        <div className="flex justify-between">
                          <span>Metal Coded Seals ({form.watch('drumQuantity') || '1'} × £5)</span>
                          <span>£{parseInt(form.watch('drumQuantity') || '1') * 5}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {form.watch('doorToDoor') && (
                    <div className="flex justify-between mt-2">
                      <span>Door-to-Door Delivery ({additionalAddresses.filter(a => a.trim() !== '').length || 1} address{additionalAddresses.filter(a => a.trim() !== '').length > 1 ? 'es' : ''})</span>
                      <span>£{(additionalAddresses.filter(a => a.trim() !== '').length || 1) * 25}</span>
                    </div>
                  )}
                  
                  {!form.watch('includeDrums') && !form.watch('includeOtherItems') && (
                    <div className="text-gray-500">No items selected yet</div>
                  )}
                  
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>£{calculateTotal()}</span>
                    </div>
                  </div>
                </div>
                
                <Alert className="bg-gray-50 dark:bg-gray-700">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please review your items and confirm if everything is correct, then click Submit to continue.
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="paymentOption"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <input
                          type="hidden"
                          value={field.value}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <input
                          type="hidden"
                          value={field.value}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
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
                    disabled={isLoading || isRestrictedPostcode}
                  >
                    {isLoading ? 'Processing...' : 'Submit Booking'}
                  </Button>
                </div>
                
                {isRestrictedPostcode && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-700">
                      Booking is not available for this postal code area. Please contact +44 7584 100552 to place a booking manually.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BookingFormNew;
