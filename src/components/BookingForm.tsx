
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
import { 
  AlertCircle, 
  Check, 
  Info, 
  PackageCheck, 
  Truck,
  Bike,
  Trash2,
  Box,
  WashingMachine,
  Sofa,
  Monitor,
  Wrench,
  Plug,
  Fan,
  PenTool,
  Briefcase,
  CreditCard,
  Banknote,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  getRouteForPostalCode, 
  isRestrictedPostalCode,
  getAreasFromPostalCode
} from '@/utils/postalCodeUtils';
import { getDateByRoute } from '@/data/collectionSchedule';

const itemCategories = {
  "Vehicles & Mobility": [
    "Bicycle", 
    "Wheelchair", 
    "Adult Walking Aid", 
    "Mobility Scooter", 
    "Car Wheels/Tyres",
    "Vehicle Parts",
    "Engine"
  ],
  "Household Items": [
    "Bin", 
    "Plastic Tubs", 
    "Washing Machine", 
    "Dishwasher", 
    "Dryer", 
    "Ironing Board",
    "Boxes", 
    "Bags", 
    "Suitcase",
    "American Fridge", 
    "Standard Fridge Freezer", 
    "Deep Freezer",
    "Heater",
    "Air Conditioner"
  ],
  "Furniture": [
    "Sofas", 
    "Chairs", 
    "Kids Push Chair", 
    "Dining Chairs", 
    "Dining Table", 
    "Coffee Table", 
    "Beds", 
    "Mattress", 
    "Dismantled Wardrobe", 
    "Chest of Drawers", 
    "Dressing Unit"
  ],
  "Home Decor": [
    "Rugs/Carpets", 
    "Wall Frames", 
    "Mirror",
    "TVs"
  ],
  "Tools & Equipment": [
    "Tool Box", 
    "Air Compressor", 
    "Generator", 
    "Solar Panels", 
    "Garden Tools", 
    "Lawn Mower", 
    "Bathroom Equipment",
    "Water Pump",
    "Building Equipment",
    "Ladder"
  ],
  "Construction": [
    "Internal Doors", 
    "External Doors", 
    "Pallet"
  ],
  "Business & Office": [
    "Office Equipment",
    "Amazon Bags", 
    "Changani Bags"
  ]
};

const allItems = Object.values(itemCategories).flat();
allItems.push("Other");

const formSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  pickupAddress: z.string().min(5, 'Address is required'),
  pickupPostcode: z.string().min(4, 'Postcode is required'),
  recipientName: z.string().min(2, 'Reciever name is required'),
  recipientPhone: z.string().min(10, 'Please enter a valid phone number'),
  deliveryAddress: z.string().min(5, 'Delivery address is required'),
  deliveryCity: z.string().min(2, 'City is required'),
  shipmentType: z.enum(['drum', 'other', 'custom']),
  drumQuantity: z.string().optional(),
  itemCategory: z.string().optional(),
  itemDescription: z.string().optional(),
  specialInstructions: z.string().optional(),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  doorToDoor: z.boolean().optional(),
  paymentOption: z.enum(['standard', 'payLater', 'cashOnCollection', 'payOnArrival']).default('standard'),
  paymentMethod: z.enum(['card', 'paypal', 'bankTransfer']).default('card'),
});

type FormValues = z.infer<typeof formSchema>;

const drumPricing = {
  standard: {
    single: 260,
    multiple: 240,
    bulk: 220
  },
  payLater: {
    single: 280,
    multiple: 260,
    bulk: 240
  }
};

interface BookingFormProps {
  onSubmitComplete: (data: FormValues, shipmentId: string, amount: number) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('sender');
  const [collectionRoute, setCollectionRoute] = useState<string | null>(null);
  const [collectionArea, setCollectionArea] = useState<string[]>([]);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [isRestrictedArea, setIsRestrictedArea] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
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
      itemCategory: '',
      itemDescription: '',
      specialInstructions: '',
      termsAgreed: false,
      doorToDoor: false,
      paymentOption: 'standard',
      paymentMethod: 'card',
    },
  });
  
  const watchShipmentType = form.watch('shipmentType');
  const watchDrumQuantity = form.watch('drumQuantity');
  const watchPostcode = form.watch('pickupPostcode');
  const watchPaymentOption = form.watch('paymentOption');
  const watchDoorToDoor = form.watch('doorToDoor');
  
  // Try to pre-fill form with user data if available
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        // Be careful with optional chaining here to avoid TS errors
        if (profile.full_name) {
          const nameParts = profile.full_name.split(' ');
          form.setValue('firstName', nameParts[0] || '');
          form.setValue('lastName', nameParts.slice(1).join(' ') || '');
        }
        
        if (profile.email) {
          form.setValue('email', profile.email);
        }
      }
    };
    
    loadUserData();
  }, []);
  
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
  
  useEffect(() => {
    if (watchShipmentType === 'drum') {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      let basePrice;
      
      if (quantity >= 5) {
        basePrice = drumPricing[watchPaymentOption].bulk;
      } else if (quantity >= 2) {
        basePrice = drumPricing[watchPaymentOption].multiple;
      } else {
        basePrice = drumPricing[watchPaymentOption].single;
      }
      
      const subtotal = basePrice * quantity;
      
      const totalWithSeal = subtotal + 5;
      
      const doorToDoorCost = watchDoorToDoor ? 25 : 0;
      
      setTotalAmount(totalWithSeal + doorToDoorCost);
    } else {
      setTotalAmount(0);
    }
  }, [watchShipmentType, watchDrumQuantity, watchPaymentOption, watchDoorToDoor]);
  
  const handleTabChange = (value: string) => {
    // Validate the current tab before moving to the next one
    if (activeTab === 'sender' && value === 'recipient') {
      const senderFields = ['firstName', 'lastName', 'email', 'phone', 'pickupAddress', 'pickupPostcode'];
      const senderFieldsValid = senderFields.every(field => form.getFieldState(field as any).invalid !== true);
      
      if (!senderFieldsValid) {
        // Trigger validation for all sender fields
        senderFields.forEach(field => form.trigger(field as any));
        return; // Don't proceed if any fields are invalid
      }
    } else if (activeTab === 'recipient' && value === 'shipment') {
      const recipientFields = ['recipientName', 'recipientPhone', 'deliveryAddress', 'deliveryCity'];
      const recipientFieldsValid = recipientFields.every(field => form.getFieldState(field as any).invalid !== true);
      
      if (!recipientFieldsValid) {
        // Trigger validation for all recipient fields
        recipientFields.forEach(field => form.trigger(field as any));
        return; // Don't proceed if any fields are invalid
      }
    } else if (activeTab === 'shipment' && value === 'payment') {
      const termsAccepted = form.getValues('termsAgreed');
      if (!termsAccepted) {
        toast({
          title: "Terms and Conditions",
          description: "Please accept the terms and conditions to proceed.",
          variant: "destructive"
        });
        return;
      }
    }
    
    setActiveTab(value);
  };
  
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
      
      if (data.shipmentType === 'custom') {
        onSubmitComplete(data, 'custom', 0);
        setIsCalculating(false);
        return;
      }
      
      const trackingNumber = `ZS${Date.now().toString().substring(5)}`;
      
      // Get the user ID if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          tracking_number: trackingNumber,
          origin: `${data.pickupAddress}, ${data.pickupPostcode}`,
          destination: `${data.deliveryAddress}, ${data.deliveryCity}`,
          status: 'pending_payment',
          carrier: 'UK Shipping',
          metadata: {
            sender_name: `${data.firstName} ${data.lastName}`,
            sender_email: data.email,
            sender_phone: data.phone,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            shipment_type: data.shipmentType,
            drum_quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity || '1', 10) : null,
            item_category: data.shipmentType === 'other' ? data.itemCategory : null,
            item_description: data.itemDescription,
            amount: totalAmount,
            payment_option: data.paymentOption,
            payment_method: data.paymentMethod,
            door_to_door: data.doorToDoor,
            metal_seal: true,
            special_instructions: data.specialInstructions || null,
            route: collectionRoute,
            collection_date: collectionDate
          },
          user_id: user?.id || null
        })
        .select('id')
        .single();
      
      if (shipmentError) {
        throw shipmentError;
      }
      
      setIsCalculating(false);
      
      onSubmitComplete(data, shipmentData.id, totalAmount);
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
  
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "Vehicles & Mobility":
        return <Bike className="h-5 w-5" />;
      case "Household Items":
        return <WashingMachine className="h-5 w-5" />;
      case "Furniture":
        return <Sofa className="h-5 w-5" />;
      case "Home Decor":
        return <Monitor className="h-5 w-5" />;
      case "Tools & Equipment":
        return <Wrench className="h-5 w-5" />;
      case "Construction":
        return <PenTool className="h-5 w-5" />;
      case "Business & Office":
        return <Briefcase className="h-5 w-5" />;
      default:
        return <Box className="h-5 w-5" />;
    }
  };
  
  const goToNextTab = () => {
    const tabOrder = ['sender', 'recipient', 'shipment', 'payment'];
    const currentIndex = tabOrder.indexOf(activeTab);
    
    if (currentIndex < tabOrder.length - 1) {
      handleTabChange(tabOrder[currentIndex + 1]);
    } else {
      // If we're on the last tab, submit the form
      form.handleSubmit(onSubmit)();
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="sender">Sender Details</TabsTrigger>
            <TabsTrigger value="recipient">Reciever Details</TabsTrigger>
            <TabsTrigger value="shipment">Shipment Details</TabsTrigger>
            <TabsTrigger value="payment">Payment Method</TabsTrigger>
          </TabsList>
          
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
            
            <div className="flex justify-end mt-4">
              <Button 
                type="button" 
                className="bg-zim-green hover:bg-zim-green/90 text-white"
                onClick={goToNextTab}
              >
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="recipient" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reciever Name</FormLabel>
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
                  <FormLabel>Reciever Phone Number</FormLabel>
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
                  <FormLabel>Delivery Address</FormLabel>
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
                  <FormLabel>City/Town</FormLabel>
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
                We deliver to all locations in the country. Standard delivery time is 4-6 weeks from collection.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleTabChange('sender')}
              >
                Back
              </Button>
              <Button 
                type="button" 
                className="bg-zim-green hover:bg-zim-green/90 text-white"
                onClick={goToNextTab}
              >
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="shipment" className="space-y-4 pt-4">
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
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="drum" id="drum" />
                        <Label htmlFor="drum">Drum Shipping</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other Items</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom">Request Custom Quote</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchShipmentType === 'drum' && (
              <div className="space-y-6 p-4 border rounded-md">
                <h3 className="font-semibold">Drum Shipping Options</h3>
                
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
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">More than 20</SelectItem>
                        </SelectContent>
                      </Select>
                      {field.value === 'other' && (
                        <Input 
                          type="number" 
                          placeholder="Enter quantity" 
                          className="mt-2" 
                          min={21}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Pricing Information</h4>
                  <p className="text-sm mb-3">Current payment option: <span className="font-medium">{watchPaymentOption === 'standard' ? 'Standard Payment' : watchPaymentOption === 'payLater' ? '30-Day Payment Terms' : watchPaymentOption === 'cashOnCollection' ? 'Cash on Collection' : 'Pay on Arrival'}</span></p>
                  
                  {watchPaymentOption === 'standard' ? (
                    <ul className="space-y-1 list-disc pl-5 text-sm">
                      <li>1 Drum: £260 each</li>
                      <li>2-4 Drums: £240 each</li>
                      <li>5+ Drums: £220 each</li>
                    </ul>
                  ) : (
                    <ul className="space-y-1 list-disc pl-5 text-sm">
                      <li>1 Drum: £280 each</li>
                      <li>2-4 Drums: £260 each</li>
                      <li>5+ Drums: £240 each</li>
                    </ul>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">Each drum has a capacity of 200L-220L</p>
                </div>
                
                <FormField
                  control={form.control}
                  name="doorToDoor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Add Door-to-Door Delivery (+£25)
                        </FormLabel>
                        <FormDescription>
                          We will deliver directly to the recipient's address
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {watchShipmentType === 'other' && (
              <div className="space-y-6 p-4 border rounded-md">
                <h3 className="font-semibold">Other Items</h3>
                
                <div>
                  <Label className="mb-2 block">Select Item Category</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.keys(itemCategories).map((category) => (
                      <div 
                        key={category} 
                        className={`p-3 border rounded-md cursor-pointer flex items-center ${selectedCategory === category ? 'bg-blue-50 border-blue-300' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <div className="mr-2 text-gray-600">
                          {getCategoryIcon(category)}
                        </div>
                        <span>{category}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedCategory && (
                  <FormField
                    control={form.control}
                    name="itemCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Specific Item</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an item" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {itemCategories[selectedCategory].map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                            <SelectItem value="Other">Other (please specify)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="itemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please provide details about your item (dimensions, weight, etc.)" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Custom Pricing</h4>
                  <p className="text-sm">Our team will review your item details and provide a custom quote.</p>
                </div>
                
                <FormField
                  control={form.control}
                  name="doorToDoor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Add Door-to-Door Delivery (+£25)
                        </FormLabel>
                        <FormDescription>
                          We will deliver directly to the recipient's address
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special handling instructions or notes" 
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
              name="termsAgreed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to the terms and conditions
                    </FormLabel>
                    <FormDescription>
                      By proceeding, you agree to our <a href="/terms" className="text-zim-green hover:underline">Terms of Service</a> and <a href="/privacy" className="text-zim-green hover:underline">Privacy Policy</a>
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleTabChange('recipient')}
              >
                Back
              </Button>
              <Button 
                type="button" 
                className="bg-zim-green hover:bg-zim-green/90 text-white"
                onClick={goToNextTab}
              >
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="payment" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="paymentOption"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Option</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2 p-3 border rounded-md">
                        <RadioGroupItem value="standard" id="standard" />
                        <div>
                          <Label htmlFor="standard" className="font-medium">Standard Payment</Label>
                          <p className="text-sm text-gray-500">Pay now to secure your shipment</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-md">
                        <RadioGroupItem value="payLater" id="payLater" />
                        <div>
                          <Label htmlFor="payLater" className="font-medium">30-Day Payment Terms</Label>
                          <p className="text-sm text-gray-500">Pay within 30 days of collection date</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-md">
                        <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                        <div>
                          <Label htmlFor="cashOnCollection" className="font-medium">Cash on Collection</Label>
                          <p className="text-sm text-gray-500">Pay cash when we collect your shipment</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-md">
                        <RadioGroupItem value="payOnArrival" id="payOnArrival" />
                        <div>
                          <Label htmlFor="payOnArrival" className="font-medium">Pay on Arrival</Label>
                          <p className="text-sm text-gray-500">Reciever pays when goods arrive at destination</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchPaymentOption === 'standard' && (
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="card" id="card" />
                          <div className="flex items-center">
                            <CreditCard className="h-5 w-5 mr-2 text-gray-600" />
                            <Label htmlFor="card">Credit/Debit Card</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="paypal" id="paypal" />
                          <div className="flex items-center">
                            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                              <path d="M20.067 8.478c.492.876.663 1.903.51 2.876-.684 4.816-5.4 6.199-9.444 6.199H9.743a.64.64 0 0 0-.631.75l.921 5.826.94.059a.639.639 0 0 0 .627-.51l.205-1.076c.184-.914.965-1.615 1.9-1.615h1.359c3.588 0 6.175-1.56 6.942-6.021.465-2.654-.067-4.396-1.939-5.759-1.367-.997-3.952-1.416-6.055-1.416H9.032c-1.155 0-1.84 1.042-1.536 2.145l1.45 5.273A1.54 1.54 0 0 0 9.498 16a9.54 9.54 0 0 0 1.635.14h1.108c.38 0 .752-.031 1.104-.097" fill="#002c8a"/>
                              <path d="M18.128 2.667C16.761 1.67 14.176 1.25 12.073 1.25H7.094c-1.155 0-1.84 1.041-1.535 2.144L8.14 13.13a1.54 1.54 0 0 0 1.552 1.159c.544.093 1.098.14 1.635.14h1.108c.38 0 .752-.032 1.104-.097a4.35 4.35 0 0 0 2.635-1.74c.443-.607.736-1.319.844-2.066.15-.87-.06-1.65-.621-2.23-.437-.45-1.084-.761-1.893-.921-.141-.028-.28-.051-.416-.07a7.98 7.98 0 0 0-1.234-.097h-3.88c-.446 0-.818-.295-.939-.724L7.38 4.852a.524.524 0 0 1 .502-.602h4.95c.989 0 1.908.135 2.637.414 1.346.512 2.225 1.265 2.627 2.25.393.956.327 2.102-.175 3.112a4.01 4.01 0 0 1-.976.5c.336.18.635.408.879.678.561.58.772 1.36.621 2.23-.108.747-.401 1.459-.844 2.066a4.35 4.35 0 0 1-2.635 1.74c-.352.065-.724.097-1.104.097h-1.108a9.54 9.54 0 0 1-1.635-.14 1.54 1.54 0 0 1-1.552-1.159L5.56 3.394c-.305-1.103.38-2.145 1.535-2.145h4.979c2.103 0 4.688.421 6.055 1.417.257.187.504.4.725.637 1.037 1.108 1.578 2.67 1.13 4.48-.397 1.598-1.396 2.738-2.856 3.373" fill="#009be1"/>
                              <path d="M12.073 7.5h-3.88c-.446 0-.818-.295-.939-.724L6.62 5.211a.524.524 0 0 1 .502-.602h4.95c.989 0 1.908.135 2.637.414 1.346.512 2.225 1.265 2.627 2.25.393.956.327 2.102-.175 3.112a4.01 4.01 0 0 1-.976.5" fill="#001f6b"/>
                            </svg>
                            <Label htmlFor="paypal">PayPal</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="bankTransfer" id="bankTransfer" />
                          <div className="flex items-center">
                            <Banknote className="h-5 w-5 mr-2 text-gray-600" />
                            <Label htmlFor="bankTransfer">Bank Transfer</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {watchShipmentType === 'drum' && (
              <div className="bg-gray-50 p-4 rounded-md mt-4">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">
                      {watchDrumQuantity} x Drum{parseInt(watchDrumQuantity) > 1 ? 's' : ''} 
                      ({watchDrumQuantity === '1' 
                        ? watchPaymentOption === 'standard' ? '£260' : '£280' 
                        : parseInt(watchDrumQuantity) >= 2 && parseInt(watchDrumQuantity) < 5
                        ? watchPaymentOption === 'standard' ? '£240' : '£260'
                        : watchPaymentOption === 'standard' ? '£220' : '£240'} each)
                    </span>
                    <span className="font-medium">
                      £{(watchPaymentOption === 'standard' 
                        ? (parseInt(watchDrumQuantity) === 1 
                          ? 260 
                          : parseInt(watchDrumQuantity) >= 2 && parseInt(watchDrumQuantity) < 5 
                          ? 240 
                          : 220) 
                        : (parseInt(watchDrumQuantity) === 1 
                          ? 280 
                          : parseInt(watchDrumQuantity) >= 2 && parseInt(watchDrumQuantity) < 5 
                          ? 260 
                          : 240)) * parseInt(watchDrumQuantity)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Mandatory Metal Seal</span>
                    <span className="font-medium">£5</span>
                  </div>
                  {watchDoorToDoor && (
                    <div className="flex justify-between">
                      <span className="text-sm">Door-to-Door Delivery</span>
                      <span className="font-medium">£25</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>£{totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between mt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleTabChange('shipment')}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="bg-zim-green hover:bg-zim-green/90 text-white"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  watchPaymentOption === 'standard' ? 'Continue to Payment' : 'Complete Booking'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
};

export default BookingForm;

