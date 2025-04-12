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
  Package, 
  Truck, 
  Upload, 
  Shield,
  Home
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  getRouteForPostalCode, 
  isRestrictedPostalCode
} from '@/utils/postalCodeUtils';
import { getDateByRoute } from '@/data/collectionSchedule';

const getAreasFromPostalCode = (postcode: string): string[] => {
  const prefix = postcode.trim().toUpperCase().split(' ')[0].replace(/[0-9]/g, '');
  
  const areaMap: Record<string, string[]> = {
    'N': ['North London'],
    'NW': ['North West London'],
    'W': ['West London'],
    'SW': ['South West London'],
    'SE': ['South East London'],
    'E': ['East London'],
    'EC': ['East Central London'],
    'WC': ['West Central London'],
    'BR': ['Bromley'],
    'CR': ['Croydon'],
    'DA': ['Dartford'],
    'EN': ['Enfield'],
    'HA': ['Harrow'],
    'IG': ['Ilford'],
    'KT': ['Kingston upon Thames'],
    'RM': ['Romford'],
    'SM': ['Sutton'],
    'TW': ['Twickenham'],
    'UB': ['Southall', 'Uxbridge'],
    'WD': ['Watford'],
  };
  
  return areaMap[prefix] || ['Area not specified'];
};

const categorizeItems = () => {
  return {
    "Household Furniture": [
      "Sofas", "Chairs", "Dining Chairs", "Dining Table", "Coffee Table", "Beds", 
      "Mattress", "Dismantled Wardrobe", "Chest of Drawers", "Dressing Unit"
    ],
    "Household Appliances": [
      "Washing Machine", "Dishwasher", "Dryer", "American Fridge", "Standard Fridge Freezer", 
      "Deep Freezer", "Air Conditioner", "Heater"
    ],
    "Transportation & Mobility": [
      "Bicycle", "Wheelchair", "Adult Walking Aid", "Mobility Scooter", "Kids Push Chair"
    ],
    "Home Items": [
      "Rugs/Carpets", "Internal Doors", "External Doors", "Wall Frames", "Mirror", 
      "Bathroom Equipment", "Ironing Board"
    ],
    "Storage & Containers": [
      "Bin", "Plastic Tubs", "Boxes", "Bags", "Suitcase", "Amazon Bags", "Changani Bags", "Pallet"
    ],
    "Automotive": [
      "Car Wheels/Tyres", "Vehicle Parts", "Engine"
    ],
    "Tools & Equipment": [
      "Tool Box", "Air Compressor", "Generator", "Solar Panels", "Garden Tools", 
      "Lawn Mower", "Water Pump", "Office Equipment", "Building Equipment", "Ladder"
    ],
    "Recreation": [
      "Trampoline", "TVs"
    ],
    "Furniture": [
      "Furniture" // Generic category for uncategorized furniture
    ]
  };
};

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
  shipmentType: z.enum(['drum', 'other']),
  drumQuantity: z.string().optional(),
  paymentOption: z.enum(['standard', '30day']),
  selectedItems: z.array(z.string()).optional(),
  otherItemDescription: z.string().optional(),
  specialInstructions: z.string().optional(),
  metalSeal: z.boolean().default(true),
  doorToDoor: z.boolean().default(false),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type FormValues = z.infer<typeof formSchema>;

const DRUM_STANDARD_PRICES = {
  single: 260, // 1 drum
  medium: 240, // 2-4 drums
  bulk: 220,   // 5+ drums
};

const DRUM_30DAY_PRICES = {
  single: 280, // 1 drum
  medium: 280, // 2-4 drums
  bulk: 240,   // 5+ drums
};

const METAL_SEAL_PRICE = 5;
const DOOR_TO_DOOR_PRICE = 25;

interface BookingFormProps {
  onSubmitComplete: (data: FormValues, shipmentId: string, amount: number) => void;
  onRequestCustomQuote: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete, onRequestCustomQuote }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [collectionRoute, setCollectionRoute] = useState<string | null>(null);
  const [collectionArea, setCollectionArea] = useState<string[]>([]);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [isRestrictedArea, setIsRestrictedArea] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [itemCategories, setItemCategories] = useState<Record<string, string[]>>(categorizeItems());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [otherSelectedItems, setOtherSelectedItems] = useState<string[]>([]);
  
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
      paymentOption: 'standard',
      selectedItems: [],
      otherItemDescription: '',
      specialInstructions: '',
      metalSeal: true,
      doorToDoor: false,
      termsAgreed: false,
    },
  });
  
  const watchShipmentType = form.watch('shipmentType');
  const watchDrumQuantity = form.watch('drumQuantity');
  const watchPaymentOption = form.watch('paymentOption');
  const watchMetalSeal = form.watch('metalSeal');
  const watchDoorToDoor = form.watch('doorToDoor');
  const watchPostcode = form.watch('pickupPostcode');
  const watchSelectedItems = form.watch('selectedItems');
  
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
  
  const handleItemSelect = (item: string) => {
    const currentItems = form.getValues('selectedItems') || [];
    
    if (currentItems.includes(item)) {
      form.setValue('selectedItems', currentItems.filter(i => i !== item));
    } else {
      form.setValue('selectedItems', [...currentItems, item]);
    }
  };
  
  const calculateDrumPrice = (quantity: number, paymentOption: 'standard' | '30day'): number => {
    const priceTable = paymentOption === 'standard' ? DRUM_STANDARD_PRICES : DRUM_30DAY_PRICES;
    
    if (quantity === 1) return priceTable.single;
    if (quantity >= 2 && quantity <= 4) return priceTable.medium;
    return priceTable.bulk; // 5+ drums
  };
  
  useEffect(() => {
    let baseAmount = 0;
    let additionalCharges = 0;
    
    if (watchShipmentType === 'drum') {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      const unitPrice = calculateDrumPrice(quantity, watchPaymentOption);
      baseAmount = unitPrice * quantity;
    }
    
    if (watchMetalSeal) {
      additionalCharges += METAL_SEAL_PRICE;
    }
    
    if (watchDoorToDoor) {
      additionalCharges += DOOR_TO_DOOR_PRICE;
    }
    
    setTotalAmount(baseAmount + additionalCharges);
  }, [watchShipmentType, watchDrumQuantity, watchPaymentOption, watchMetalSeal, watchDoorToDoor]);
  
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
            selected_items: data.shipmentType === 'other' ? data.selectedItems : null,
            payment_option: data.paymentOption,
            metal_seal: data.metalSeal,
            door_to_door: data.doorToDoor,
            amount: totalAmount,
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
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="sender" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sender">Sender Details</TabsTrigger>
            <TabsTrigger value="recipient">Recipient Details</TabsTrigger>
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
          
          <TabsContent value="shipment" className="space-y-4 pt-4">
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
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other Items</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchShipmentType === 'drum' && (
              <div className="space-y-6">
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
                
                <FormField
                  control={form.control}
                  name="paymentOption"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Payment Option</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-4"
                        >
                          <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="standard" id="standard" className="mt-1" />
                              <div>
                                <Label htmlFor="standard" className="font-medium">Standard Payment</Label>
                                <p className="text-sm text-gray-500 mt-1">
                                  Pay now for the best rates:
                                </p>
                                <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                                  <li>1 drum: £{DRUM_STANDARD_PRICES.single} each</li>
                                  <li>2-4 drums: £{DRUM_STANDARD_PRICES.medium} each</li>
                                  <li>5+ drums: £{DRUM_STANDARD_PRICES.bulk} each</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value="30day" id="30day" className="mt-1" />
                              <div>
                                <Label htmlFor="30day" className="font-medium">30-Day Payment Plan</Label>
                                <p className="text-sm text-gray-500 mt-1">
                                  Pay within 30 days of collection:
                                </p>
                                <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                                  <li>1 drum: £{DRUM_30DAY_PRICES.single} each</li>
                                  <li>2-4 drums: £{DRUM_30DAY_PRICES.medium} each</li>
                                  <li>5+ drums: £{DRUM_30DAY_PRICES.bulk} each</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {watchShipmentType === 'other' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Select Items to Ship</h3>
                  
                  <div className="flex mb-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onRequestCustomQuote}
                      className="flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Request Custom Quote
                    </Button>
                    <p className="text-sm text-gray-500 ml-3 mt-2">
                      For items not listed or special requirements
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Select onValueChange={(value) => setSelectedCategory(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(itemCategories).map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedCategory && (
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-3">{selectedCategory}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {itemCategories[selectedCategory].map((item) => (
                            <div 
                              key={item} 
                              className={`
                                flex items-center space-x-2 p-2 border rounded-md cursor-pointer
                                ${watchSelectedItems?.includes(item) ? 'bg-blue-50 border-blue-200' : ''}
                              `}
                              onClick={() => handleItemSelect(item)}
                            >
                              <Checkbox 
                                checked={watchSelectedItems?.includes(item)} 
                                onCheckedChange={() => handleItemSelect(item)}
                              />
                              <label className="cursor-pointer flex-grow text-sm">{item}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {watchSelectedItems && watchSelectedItems.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <h4 className="font-medium mb-2">Selected Items:</h4>
                        <div className="flex flex-wrap gap-2">
                          {watchSelectedItems.map((item) => (
                            <div 
                              key={item} 
                              className="bg-white px-2 py-1 rounded-full border flex items-center text-sm"
                            >
                              {item}
                              <button 
                                type="button" 
                                className="ml-1 text-gray-500 hover:text-gray-700"
                                onClick={() => handleItemSelect(item)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-amber-800 text-sm">
                        <strong>Note:</strong> After selecting your items, we'll calculate a quote 
                        based on volume. You'll be able to review the quote before proceeding to payment.
                      </p>
                    </div>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="otherItemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Item Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide additional details about your items"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Please include any specific details about size, condition, or special handling requirements.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="mt-8 space-y-4">
              <h3 className="font-medium">Additional Services</h3>
              
              <FormField
                control={form.control}
                name="metalSeal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-gray-50 p-3 rounded-md border">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={true}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center">
                        <FormLabel className="font-medium">
                          Metal Security Seal
                        </FormLabel>
                        <span className="ml-2 text-blue-600 font-medium">£{METAL_SEAL_PRICE}</span>
                      </div>
                      <FormDescription>
                        <div className="flex items-center">
                          <Shield className="h-3 w-3 mr-1 text-green-600" /> 
                          Mandatory security seal for all shipments
                        </div>
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="doorToDoor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-green-50 p-3 rounded-md border border-green-100">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center">
                        <FormLabel className="font-medium">
                          Door-to-Door Delivery
                        </FormLabel>
                        <span className="ml-2 text-blue-600 font-medium">£{DOOR_TO_DOOR_PRICE}</span>
                      </div>
                      <FormDescription>
                        <div className="flex items-center">
                          <Home className="h-3 w-3 mr-1 text-green-600" /> 
                          Direct delivery to the recipient's doorstep in Zimbabwe
                        </div>
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
              <h3 className="font-medium mb-2">Price Summary</h3>
              <div className="space-y-2 border rounded-md p-4 bg-blue-50">
                {watchShipmentType === 'drum' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Drums ({watchDrumQuantity} × £{calculateDrumPrice(parseInt(watchDrumQuantity), watchPaymentOption)})</span>
                      <span>£{(parseInt(watchDrumQuantity) * calculateDrumPrice(parseInt(watchDrumQuantity), watchPaymentOption)).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Metal Security Seal (Mandatory)</span>
                      <span>£{METAL_SEAL_PRICE.toFixed(2)}</span>
                    </div>
                    
                    {watchDoorToDoor && (
                      <div className="flex justify-between text-sm">
                        <span>Door-to-Door Delivery</span>
                        <span>£{DOOR_TO_DOOR_PRICE.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="border-t my-2"></div>
                    
                    <div className="flex justify-between font-medium">
                      <span>Total Amount</span>
                      <span>£{totalAmount.toFixed(2)}</span>
                    </div>
                    
                    {watchPaymentOption === '30day' && (
                      <div className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                        <p className="font-medium text-amber-700">30-Day Payment Plan:</p>
                        <p>You'll have 30 days from the collection date to complete your payment.</p>
                      </div>
                    )}
                  </>
                )}
                
                {watchShipmentType === 'other' && (
                  <div className="py-3 text-center">
                    <Package className="h-12 w-12 mx-auto mb-2 text-blue-400" />
                    <p>Custom pricing will be calculated based on your selected items.</p>
                    <div className="mt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onRequestCustomQuote}
                        className="text-sm"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Need a custom quote?
                      </Button>
                    </div>
                  </div>
                )}
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
