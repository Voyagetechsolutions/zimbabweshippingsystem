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
  Briefcase
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
  recipientName: z.string().min(2, 'Recipient name is required'),
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
  paymentOption: z.enum(['standard', 'payLater']).default('standard'),
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
    },
  });
  
  const watchShipmentType = form.watch('shipmentType');
  const watchDrumQuantity = form.watch('drumQuantity');
  const watchPostcode = form.watch('pickupPostcode');
  const watchPaymentOption = form.watch('paymentOption');
  const watchDoorToDoor = form.watch('doorToDoor');
  
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
      
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          user_id: null,
          status: 'pending_payment',
          tracking_number: trackingNumber,
          origin: `${data.pickupAddress}, ${data.pickupPostcode}`,
          destination: `${data.deliveryAddress}, ${data.deliveryCity}, Zimbabwe`,
          carrier: 'Zimbabwe Shipping',
          metadata: {
            sender_name: `${data.firstName} ${data.lastName}`,
            sender_email: data.email,
            sender_phone: data.phone,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            shipment_type: data.shipmentType,
            drum_quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity || '1', 10) : null,
            item_category: data.shipmentType === 'other' ? data.itemCategory : null,
            item_description: data.shipmentType === 'other' ? data.itemDescription : null,
            amount: totalAmount,
            payment_option: data.paymentOption,
            door_to_door: data.doorToDoor,
            metal_seal: true,
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
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="sender" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sender">Sender Details</TabsTrigger>
            <TabsTrigger value="recipient">Receiver Details</TabsTrigger>
            <TabsTrigger value="shipment">Shipment Details</TabsTrigger>
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
          </TabsContent>
          
          <TabsContent value="recipient" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receiver Name</FormLabel>
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
                  <FormLabel>Receiver Phone Number</FormLabel>
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
                We deliver to all locations in Zimbabwe. Standard delivery time is 7-8 weeks from loading day.
              </AlertDescription>
            </Alert>
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
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Pricing Information</h4>
                  <p className="text-sm mb-3">Current payment option: <span className="font-medium">{watchPaymentOption === 'standard' ? 'Standard Payment' : '30-Day Payment Terms'}</span></p>
                  
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
                  
                  <p className="text-xs text-gray-500 mt-2">Each drum has a capacity of 200L</p>
                </div>
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
                  <h4 className="font-medium mb-2">Volume-Based Pricing</h4>
                  <p className="text-sm">We charge based on volume rather than weight:</p>
                  <ul className="space-y-1 list-disc pl-5 text-sm mt-2">
                    <li>Pricing varies by item size and type</li>
                    <li>Please provide accurate item description</li>
                    <li>We'll contact you with a price quote</li>
                  </ul>
                  
                  <div className="mt-4">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => form.setValue('shipmentType', 'custom')}
                    >
                      Request Custom Quote
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {watchShipmentType === 'custom' && (
              <div className="p-4 bg-blue-50 rounded-md">
                <h3 className="font-medium text-blue-800 mb-2">Request Custom Quote</h3>
                <p className="text-sm mb-4">
                  For items that don't fit our standard categories, we offer custom quotes. 
                  Submit your shipping details and we'll contact you with a personalized quote.
                </p>
                <p className="text-sm font-medium">
                  Click "Continue" to proceed with your custom quote request.
                </p>
              </div>
            )}
            
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold">Additional Services</h3>
              
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                <Checkbox disabled checked />
                <div>
                  <Label className="font-medium">Mandatory Metal Seal</Label>
                  <p className="text-sm text-gray-500">For increased security (£5.00)</p>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="doorToDoor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Door-to-Door Delivery
                      </FormLabel>
                      <FormDescription>
                        We'll deliver directly to the recipient's address (£25.00)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any special instructions for your shipment" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">
                    {parseInt(watchDrumQuantity || '1', 10)} x Drum{parseInt(watchDrumQuantity || '1', 10) > 1 ? 's' : ''}
                  </span>
                  <span>£{parseInt(watchDrumQuantity || '1', 10) >= 5 
                    ? (watchPaymentOption === 'standard' ? 220 : 240)
                    : parseInt(watchDrumQuantity || '1', 10) >= 2
                      ? (watchPaymentOption === 'standard' ? 240 : 260)
                      : (watchPaymentOption === 'standard' ? 260 : 280)
                    } x {parseInt(watchDrumQuantity || '1', 10)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Mandatory Metal Seal</span>
                  <span>£5.00</span>
                </div>
                {watchDoorToDoor && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Door-to-Door Delivery</span>
                    <span>£25.00</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t font-medium">
                  <span>Total</span>
                  <span className="text-zim-green">£{totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            
            <FormField
              control={form.control}
              name="termsAgreed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
                      By checking this box, you confirm that you have read and agreed to our <a href="/terms" className="text-zim-green hover:underline">Terms and Conditions</a>.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-zim-green hover:bg-zim-green/90 text-white"
            disabled={isCalculating}
          >
            {isCalculating ? 'Processing...' : watchShipmentType === 'custom' ? 'Continue to Custom Quote' : 'Continue to Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BookingForm;
