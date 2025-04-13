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
import { getValidUserId } from '@/utils/supabaseUtils';

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
    if (activeTab === 'sender' && value === 'recipient') {
      const senderFields = ['firstName', 'lastName', 'email', 'phone', 'pickupAddress', 'pickupPostcode'];
      const senderFieldsValid = senderFields.every(field => form.getFieldState(field as any).invalid !== true);
      
      if (!senderFieldsValid) {
        senderFields.forEach(field => form.trigger(field as any));
        return;
      }
    } else if (activeTab === 'recipient' && value === 'shipment') {
      const recipientFields = ['recipientName', 'recipientPhone', 'deliveryAddress', 'deliveryCity'];
      const recipientFieldsValid = recipientFields.every(field => form.getFieldState(field as any).invalid !== true);
      
      if (!recipientFieldsValid) {
        recipientFields.forEach(field => form.trigger(field as any));
        return;
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
    
      // Get a valid user ID - will be null for non-authenticated users
      const userId = await getValidUserId();
      
      try {
        const shipmentData = {
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
          user_id: userId
        };
        
        console.log("Creating shipment with data:", shipmentData);
        
        // Only add user_id field if we have a valid user
        if (userId === null) {
          delete shipmentData.user_id;
        }
        
        const { data: result, error: shipmentError } = await supabase
          .from('shipments')
          .insert(shipmentData)
          .select('id')
          .single();
        
        if (shipmentError) {
          console.error('Shipment creation error:', shipmentError);
          throw shipmentError;
        }
        
        setIsCalculating(false);
        onSubmitComplete(data, result.id, totalAmount);
      } catch (error: any) {
        console.error('Error creating shipment:', error);
        setIsCalculating(false);
        toast({
          title: 'Error',
          description: error.message || 'An error occurred while processing your booking. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
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
      form.handleSubmit(onSubmit)();
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
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
          </TabsContent>
          
          <TabsContent value="payment" className="space-y-4 pt-4">
            <div className="space-y-6">
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
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="standard" id="standard" />
                          <Label htmlFor="standard" className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4 text-zim-green" />
                            <div>
                              <span className="font-medium">Standard Payment</span>
                              <p className="text-xs text-gray-500">Pay now using card or PayPal</p>
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="payLater" id="payLater" />
                          <Label htmlFor="payLater" className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-zim-green" />
                            <div>
                              <span className="font-medium">30-Day Payment Terms</span>
                              <p className="text-xs text-gray-500">Pay within 30 days (slightly higher rates)</p>
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                          <Label htmlFor="cashOnCollection" className="flex items-center">
                            <Banknote className="mr-2 h-4 w-4 text-zim-green" />
                            <div>
                              <span className="font-medium">Cash on Collection</span>
                              <p className="text-xs text-gray-500">Pay cash when your items are collected</p>
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="payOnArrival" id="payOnArrival" />
                          <Label htmlFor="payOnArrival" className="flex items-center">
                            <Truck className="mr-2 h-4 w-4 text-zim-green" />
                            <div>
                              <span className="font-medium">Pay on Arrival</span>
                              <p className="text-xs text-gray-500">Pay when your shipment arrives in Zimbabwe</p>
                            </div>
                          </Label>
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
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="card" id="card" />
                            <Label htmlFor="card">Credit/Debit Card</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="paypal" id="paypal" />
                            <Label htmlFor="paypal">PayPal</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bankTransfer" id="bankTransfer" />
                            <Label htmlFor="bankTransfer">Bank Transfer</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Card className="bg-gray-50">
                <CardContent className="p-4 mt-4">
                  <h3 className="font-semibold mb-2">Booking Summary</h3>
                  
                  {watchShipmentType === 'drum' ? (
                    <>
                      <div className="flex justify-between py-2 text-sm border-b">
                        <span>{parseInt(watchDrumQuantity || '1', 10)} x Drum Shipping</span>
                        <span>£{totalAmount - 5}</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm border-b">
                        <span>Metal Seal (Mandatory)</span>
                        <span>£5</span>
                      </div>
                      {watchDoorToDoor && (
                        <div className="flex justify-between py-2 text-sm border-b">
                          <span>Door-to-Door Delivery</span>
                          <span>£25</span>
                        </div>
                      )}
                      <div className="flex justify-between py-3 font-bold">
                        <span>Total</span>
                        <span>£{totalAmount}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm italic text-gray-600">
                      {watchShipmentType === 'other' 
                        ? 'Custom quote will be provided after submission' 
                        : 'Please provide shipment details for a quote'}
                    </p>
                  )}
                </CardContent>
              </Card>
              
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
                        By checking this box, you agree to our <a href="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</a>.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-between mt-4">
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
                  <>
                    <span className="mr-2">Processing...</span>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </>
                ) : (
                  'Complete Booking'
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
