
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Check, Info, PackageCheck, Truck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  getRouteForPostalCode, 
  isRestrictedPostalCode,
  getAreasFromPostalCode
} from '@/utils/postalCodeUtils';
import { getDateByRoute } from '@/data/collectionSchedule';

// Define the form schema
const formSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  pickupAddress: z.string().min(5, 'Address is required'),
  pickupPostcode: z.string().min(4, 'Postcode is required'),
  recipientName: z.string().min(2, 'Recipient name is required'),
  recipientPhone: z.string().min(10, 'Please enter a valid phone number'),
  deliveryAddress: z.string().min(5, 'Delivery address is required'),
  deliveryCity: z.string().min(2, 'City is required'),
  shipmentType: z.enum(['drum', 'parcel']),
  drumQuantity: z.string().optional(),
  weight: z.string().optional(),
  specialInstructions: z.string().optional(),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type FormValues = z.infer<typeof formSchema>;

const initialDrumPrices = {
  small: 150,
  medium: 185,
  large: 220,
};

const parcelRatePerKg = 14;

interface BookingFormProps {
  onSubmitComplete: (data: FormValues, shipmentId: string, amount: number) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [collectionRoute, setCollectionRoute] = useState<string | null>(null);
  const [collectionArea, setCollectionArea] = useState<string[]>([]);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [isRestrictedArea, setIsRestrictedArea] = useState(false);
  const [drumSize, setDrumSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pickupAddress: '',
      pickupPostcode: '',
      recipientName: '',
      recipientPhone: '',
      deliveryAddress: '',
      deliveryCity: '',
      shipmentType: 'drum',
      drumQuantity: '1',
      weight: '',
      specialInstructions: '',
      termsAgreed: false,
    },
  });
  
  const watchShipmentType = form.watch('shipmentType');
  const watchDrumQuantity = form.watch('drumQuantity');
  const watchWeight = form.watch('weight');
  const watchPostcode = form.watch('pickupPostcode');
  
  // Handle postal code changes
  useEffect(() => {
    if (watchPostcode && watchPostcode.length >= 2) {
      const route = getRouteForPostalCode(watchPostcode);
      setCollectionRoute(route);
      
      if (route) {
        setCollectionArea(getAreasFromPostalCode(watchPostcode));
        setCollectionDate(getDateByRoute(route));
      } else {
        setCollectionArea([]);
        setCollectionDate(null);
      }
      
      setIsRestrictedArea(isRestrictedPostalCode(watchPostcode));
    } else {
      setCollectionRoute(null);
      setCollectionArea([]);
      setCollectionDate(null);
      setIsRestrictedArea(false);
    }
  }, [watchPostcode]);
  
  // Calculate total amount when form values change
  useEffect(() => {
    if (watchShipmentType === 'drum') {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      const basePrice = initialDrumPrices[drumSize];
      setTotalAmount(basePrice * quantity);
    } else if (watchShipmentType === 'parcel') {
      const weight = parseFloat(watchWeight || '0');
      if (!isNaN(weight) && weight > 0) {
        const calculatedAmount = weight * parcelRatePerKg;
        setTotalAmount(calculatedAmount);
      } else {
        setTotalAmount(0);
      }
    }
  }, [watchShipmentType, watchDrumQuantity, watchWeight, drumSize]);
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setIsCalculating(true);
      
      if (isRestrictedArea) {
        toast({
          title: "Restricted Area",
          description: "Please contact us directly for shipments from this area.",
          variant: "destructive"
        });
        setIsCalculating(false);
        return;
      }
      
      // Calculate final amount based on form data
      let finalAmount = 0;
      
      if (data.shipmentType === 'drum') {
        const quantity = parseInt(data.drumQuantity || '1', 10);
        const basePrice = initialDrumPrices[drumSize];
        finalAmount = basePrice * quantity;
      } else if (data.shipmentType === 'parcel') {
        const weight = parseFloat(data.weight || '0');
        if (!isNaN(weight) && weight > 0) {
          finalAmount = weight * parcelRatePerKg;
        }
      }
      
      // Generate a tracking number
      const trackingNumber = `ZS${Date.now().toString().substring(5)}`;
      
      // Create shipment in the database - using the correct schema fields
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          user_id: null, // Will be updated after payment if user is authenticated
          status: 'pending_payment',
          tracking_number: trackingNumber,
          origin: `${data.pickupAddress}, ${data.pickupPostcode}`,
          destination: `${data.deliveryAddress}, ${data.deliveryCity}, Zimbabwe`,
          carrier: 'Zimbabwe Shipping',
          weight: data.shipmentType === 'parcel' ? parseFloat(data.weight || '0') : null,
          dimensions: data.shipmentType === 'drum' ? `${drumSize} drum x ${data.drumQuantity}` : null,
          metadata: {
            sender_name: `${data.firstName} ${data.lastName}`,
            sender_email: data.email,
            sender_phone: data.phone,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            shipment_type: data.shipmentType,
            drum_size: data.shipmentType === 'drum' ? drumSize : null,
            drum_quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity || '1', 10) : null,
            amount: finalAmount,
            special_instructions: data.specialInstructions || null,
            route: collectionRoute,
            collection_date: collectionDate
          }
        })
        .select('id')
        .single();
      
      if (shipmentError) {
        throw shipmentError;
      }
      
      setIsCalculating(false);
      
      // Pass the data to the parent component for payment processing
      onSubmitComplete(data, shipmentData.id, finalAmount);
      
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      setIsCalculating(false);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while processing your booking. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="sender" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sender">Sender Details</TabsTrigger>
            <TabsTrigger value="recipient">Recipient Details</TabsTrigger>
            <TabsTrigger value="shipment">Shipment Details</TabsTrigger>
          </TabsList>
          
          {/* Sender Details Tab */}
          <TabsContent value="sender" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
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
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                      <Input placeholder="+44 7123 456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="pickupAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your full address" 
                      className="resize-none" 
                      {...field} 
                    />
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
                  <FormLabel>Postcode</FormLabel>
                  <FormControl>
                    <Input placeholder="AB12 3CD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Collection Information Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-zim-green" />
                  Collection Information
                </CardTitle>
                <CardDescription>
                  Based on your postcode, we'll collect your shipment on the following schedule:
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isRestrictedArea && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Restricted Area</AlertTitle>
                    <AlertDescription>
                      Your postcode falls in a restricted area. Please contact us directly at +44 7584 100552 to arrange collection.
                    </AlertDescription>
                  </Alert>
                )}
                
                {collectionRoute ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Collection Route</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        {collectionRoute || "Please enter a valid postcode"}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Collection Area</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        {collectionArea.length > 0 ? collectionArea.join(", ") : "No areas found for this route"}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Collection Date</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        {collectionDate || "No date available for this route"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Enter your postcode to see collection details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Recipient Details Tab */}
          <TabsContent value="recipient" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" {...field} />
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
                  <FormLabel>Recipient Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+263 77 123 4567" {...field} />
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
                  <FormLabel>Delivery Address in Zimbabwe</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the delivery address" 
                      className="resize-none" 
                      {...field} 
                    />
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
                  <FormLabel>City/Town in Zimbabwe</FormLabel>
                  <FormControl>
                    <Input placeholder="Harare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Delivery Information</AlertTitle>
              <AlertDescription>
                We deliver to all locations in Zimbabwe. Standard delivery time is 4-6 weeks from collection.
              </AlertDescription>
            </Alert>
            
          </TabsContent>
          
          {/* Shipment Details Tab */}
          <TabsContent value="shipment" className="space-y-4 pt-4">
            {/* Restricted Areas Notice */}
            <Card className="border-yellow-300 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-yellow-800">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Restricted Areas Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-800 text-sm">
                  We have delivery restrictions in some areas. If your postcode falls in one of the following areas, 
                  please contact us directly to arrange your shipment:
                </p>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-yellow-800">
                  <div>EX, TQ, DT, SA</div>
                  <div>LD, HR, IP, NR</div>
                  <div>HU, TS, DL, SR</div>
                  <div>DH, CA, NE, TD</div>
                  <div>EH, ML, KA, DG</div>
                  <div>G, KY, PA, IV</div>
                  <div>AB, DD</div>
                </div>
              </CardContent>
            </Card>
            
            <FormField
              control={form.control}
              name="shipmentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Shipment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="drum" id="drum" />
                        <Label htmlFor="drum">Drum Shipping</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="parcel" id="parcel" />
                        <Label htmlFor="parcel">Parcel Shipping</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchShipmentType === 'drum' && (
              <div className="space-y-4">
                <div>
                  <Label>Drum Size</Label>
                  <RadioGroup
                    defaultValue={drumSize}
                    onValueChange={(value) => setDrumSize(value as 'small' | 'medium' | 'large')}
                    className="mt-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`border rounded-lg p-4 ${drumSize === 'small' ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="small" id="small" className="mt-1" />
                          <div>
                            <Label htmlFor="small" className="font-medium">Small Drum</Label>
                            <p className="text-sm text-gray-500">£150 per drum</p>
                            <p className="text-xs text-gray-500 mt-1">Capacity: 60 liters</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`border rounded-lg p-4 ${drumSize === 'medium' ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="medium" id="medium" className="mt-1" />
                          <div>
                            <Label htmlFor="medium" className="font-medium">Medium Drum</Label>
                            <p className="text-sm text-gray-500">£185 per drum</p>
                            <p className="text-xs text-gray-500 mt-1">Capacity: 120 liters</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`border rounded-lg p-4 ${drumSize === 'large' ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="large" id="large" className="mt-1" />
                          <div>
                            <Label htmlFor="large" className="font-medium">Large Drum</Label>
                            <p className="text-sm text-gray-500">£220 per drum</p>
                            <p className="text-xs text-gray-500 mt-1">Capacity: 210 liters</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                
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
                          placeholder="1" 
                          {...field}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            field.onChange(val < 1 ? '1' : e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {watchShipmentType === 'parcel' && (
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0.1" 
                        placeholder="Enter weight in kg" 
                        {...field}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          field.onChange(val < 0.1 ? '0.1' : e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Rate: £{parcelRatePerKg} per kg
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special handling or delivery instructions" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="items">
                <AccordionTrigger>What can I ship?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Allowed Items:</strong> Clothing, shoes, non-perishable food items, household goods, electronics (for personal use), books, and toiletries.</p>
                    <p><strong>Restricted Items:</strong> Batteries, aerosols, perfumes, and certain electronics may have restrictions.</p>
                    <p><strong>Prohibited Items:</strong> Illegal substances, weapons, flammable items, perishable foods, and currency.</p>
                    <p>For a complete list, please refer to our <a href="/services" className="text-blue-600 hover:underline">Shipping Guidelines</a>.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div>
              <Label>Total Amount</Label>
              <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg font-medium text-xl">
                £{totalAmount.toFixed(2)}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="termsAgreed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to the <a href="/terms" className="text-blue-600 hover:underline">terms and conditions</a> and <a href="/privacy" className="text-blue-600 hover:underline">privacy policy</a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between mt-8">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCalculating} className="bg-zim-green hover:bg-zim-green/90">
            {isCalculating ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BookingForm;
