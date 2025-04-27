
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Loader2, Plus, User, Users, Package, CreditCard, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getRouteForPostalCode, isRestrictedPostalCode, getIrelandRouteForCity } from '@/utils/postalCodeUtils';
import { generateUniqueId } from '@/lib/utils';
import { getDateByRoute, getIrelandCities } from '@/data/collectionSchedule';
import CollectionInfo from '@/components/CollectionInfo';

const bookingFormSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  pickupCountry: z.string().min(1, { message: 'Please select a country' }),
  pickupAddress: z.string().min(5, { message: 'Please enter a valid address' }),
  pickupCity: z.string().optional(),
  pickupPostcode: z.string().optional(),
  
  recipientName: z.string().min(2, { message: 'Recipient name must be at least 2 characters' }),
  recipientPhone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  additionalRecipientPhone: z.string().optional(),
  deliveryAddress: z.string().min(5, { message: 'Please enter a valid address' }),
  deliveryCity: z.string().min(2, { message: 'Please enter a valid city' }),
  
  shipmentType: z.enum(['drum', 'other']),
  drumQuantity: z.string().optional(),
  wantMetalSeal: z.boolean().default(true),
  itemCategory: z.string().optional(),
  specificItem: z.string().optional(),
  otherItemDescription: z.string().optional(),
  doorToDoor: z.boolean().default(false),
  additionalDeliveryAddresses: z.array(z.object({
    address: z.string().min(5, { message: 'Please enter a valid address' }),
    city: z.string().min(2, { message: 'Please enter a valid city' }),
    recipientName: z.string().min(2, { message: 'Recipient name must be at least 2 characters' }),
    recipientPhone: z.string().min(10, { message: 'Please enter a valid phone number' })
  })).optional(),
  
  paymentOption: z.enum(['standard', 'cashOnCollection', 'payOnArrival']),
  paymentMethod: z.enum(['card', 'paypal']).optional(),
  terms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  onSubmitComplete: (data: BookingFormValues, shipmentId: string, amount: number) => void;
}

const itemCategories = {
  'furniture': ['Sofa', 'Chair', 'Dining Table & Chairs', 'Coffee Table', 'Bed', 'Mattress', 'Wardrobe (dismantled)', 'Chest of Drawers', 'Dressing Unit', 'Wall Frame', 'Mirror', 'Home Furniture (other)', 'Office Furniture'],
  'appliances': ['Washing Machine', 'Dishwasher', 'Dryer', 'American Fridge', 'Standard Fridge', 'Freezer', 'Deep Freezer', 'TV', 'Air Conditioner', 'Heater'],
  'garden': ['Garden Tools', 'Lawn Mower', 'Trampoline'],
  'transportation': ['Bicycle', 'Car Wheels/Tyres', 'Vehicle Parts', 'Engine', 'Mobility Scooter'],
  'household': ['Plastic Tubs', 'Bin', 'Ironing Board', 'Rugs', 'Carpets', 'Internal Doors', 'External Doors', 'Bathroom Equipment'],
  'mobility': ['Wheelchair', 'Adult Walking Aid', 'Kids Push Chair'],
  'storage': ['Boxes', 'Bags', 'Suitcase', 'Amazon Bag', 'China Bags', 'Pallets'],
  'equipment': ['Tool Box', 'Air Compressor', 'Generator', 'Solar Panel', 'Water Pump', 'Pool Pump'],
  'building': ['Building Materials', 'Home Decor', 'Ladders'],
  'other': ['Other Item']
};

const BookingFormNew: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showPostcodeWarning, setShowPostcodeWarning] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [sealCost, setSealCost] = useState<number>(0);
  const [doorToDoorCost, setDoorToDoorCost] = useState<number>(0);
  const [showCollectionInfo, setShowCollectionInfo] = useState(false);
  const [irelandCities, setIrelandCities] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('sender');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [redirectToCustomQuote, setRedirectToCustomQuote] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [additionalAddresses, setAdditionalAddresses] = useState<Array<{address: string, city: string, recipientName: string, recipientPhone: string}>>([]);
  const [hasAdditionalPhone, setHasAdditionalPhone] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    setIrelandCities(getIrelandCities());
  }, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pickupCountry: 'England',
      pickupAddress: '',
      pickupPostcode: '',
      pickupCity: '',
      recipientName: '',
      recipientPhone: '',
      additionalRecipientPhone: '',
      deliveryAddress: '',
      deliveryCity: '',
      shipmentType: 'drum',
      drumQuantity: '1',
      wantMetalSeal: true,
      itemCategory: '',
      specificItem: '',
      otherItemDescription: '',
      doorToDoor: false,
      additionalDeliveryAddresses: [],
      paymentOption: 'standard',
      paymentMethod: 'card',
      terms: false,
    },
  });

  const watchShipmentType = form.watch('shipmentType');
  const watchPaymentOption = form.watch('paymentOption');
  const watchPickupPostcode = form.watch('pickupPostcode');
  const watchPickupCountry = form.watch('pickupCountry');
  const watchPickupCity = form.watch('pickupCity');
  const watchDrumQuantity = form.watch('drumQuantity');
  const watchWantMetalSeal = form.watch('wantMetalSeal');
  const watchDoorToDoor = form.watch('doorToDoor');
  const watchItemCategory = form.watch('itemCategory');
  const watchSpecificItem = form.watch('specificItem');

  const renderShipmentTypeOptions = () => {
    return (
      <RadioGroup
        value={form.getValues('shipmentType')}
        onValueChange={(value) => {
          form.setValue('shipmentType', value as 'drum' | 'other');
          
          if (value === 'drum') {
            if (!form.getValues('drumQuantity') || form.getValues('drumQuantity') === '0') {
              form.setValue('drumQuantity', '1');
            }
            form.setValue('itemCategory', '');
            form.setValue('specificItem', '');
            form.setValue('otherItemDescription', '');
          } else if (value === 'other') {
            form.setValue('drumQuantity', '1');
            setSelectedCategory('');
          }
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
      >
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${form.getValues('shipmentType') === 'drum' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => {
            form.setValue('shipmentType', 'drum');
            if (!form.getValues('drumQuantity') || form.getValues('drumQuantity') === '0') {
              form.setValue('drumQuantity', '1');
            }
            form.setValue('itemCategory', '');
            form.setValue('specificItem', '');
            form.setValue('otherItemDescription', '');
          }}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="drum" id="drum" />
            <FormLabel htmlFor="drum" className="cursor-pointer font-medium">Drum (Standard Size)</FormLabel>
          </div>
          <p className="text-sm text-gray-500 mt-2">Standard size drums (200L-220L) for goods</p>
        </div>
        
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${form.getValues('shipmentType') === 'other' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => {
            form.setValue('shipmentType', 'other');
            setSelectedCategory('');
          }}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="other" id="other" />
            <FormLabel htmlFor="other" className="cursor-pointer font-medium">Other Item</FormLabel>
          </div>
          <p className="text-sm text-gray-500 mt-2">Other items requiring a custom quote</p>
        </div>
      </RadioGroup>
    );
  };

  const addNewDeliveryAddress = () => {
    setAdditionalAddresses([
      ...additionalAddresses, 
      {address: '', city: '', recipientName: '', recipientPhone: ''}
    ]);
  };

  const removeDeliveryAddress = (index: number) => {
    const newAddresses = [...additionalAddresses];
    newAddresses.splice(index, 1);
    setAdditionalAddresses(newAddresses);
  };

  const updateDeliveryAddress = (index: number, field: string, value: string) => {
    const newAddresses = [...additionalAddresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setAdditionalAddresses(newAddresses);
  };

  useEffect(() => {
    if (watchPickupCountry === 'England' && watchPickupPostcode?.trim().length > 0) {
      const isRestricted = isRestrictedPostalCode(watchPickupPostcode);
      setShowPostcodeWarning(isRestricted);
      
      const hasRoute = getRouteForPostalCode(watchPickupPostcode) !== null;
      setShowCollectionInfo(hasRoute);
    } else {
      setShowPostcodeWarning(false);
      setShowCollectionInfo(false);
    }
  }, [watchPickupPostcode, watchPickupCountry]);

  useEffect(() => {
    if (watchPickupCountry === 'Ireland' && watchPickupCity?.trim().length > 0) {
      const hasRoute = getIrelandRouteForCity(watchPickupCity) !== null;
      setShowCollectionInfo(hasRoute);
    }
  }, [watchPickupCity, watchPickupCountry]);

  useEffect(() => {
    setShowPaymentMethods(false);
  }, [watchPaymentOption]);

  useEffect(() => {
    if (watchShipmentType === 'other' && 
        watchItemCategory && 
        (watchSpecificItem || form.getValues('otherItemDescription'))) {
      setRedirectToCustomQuote(true);
    } else {
      setRedirectToCustomQuote(false);
    }
  }, [watchShipmentType, watchItemCategory, watchSpecificItem, form]);

  // Calculate drum price based on quantity and payment option
  useEffect(() => {
    if (watchShipmentType === 'drum') {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      let basePrice;
      
      if (quantity === 1) {
        basePrice = 280;
      } else if (quantity >= 2 && quantity <= 4) {
        basePrice = 260 * quantity;
      } else if (quantity >= 5) {
        basePrice = 240 * quantity;
      } else {
        basePrice = 280;
      }
      
      setOriginalPrice(basePrice);
      
      // Calculate metal seal cost
      const sealPrice = watchWantMetalSeal ? 5 * quantity : 0;
      setSealCost(sealPrice);
      
      // Calculate door-to-door cost (£25 per address, including main address if selected)
      const addressCount = watchDoorToDoor ? 1 + additionalAddresses.length : 0;
      const doorCost = addressCount * 25;
      setDoorToDoorCost(doorCost);
      
      if (watchPaymentOption === 'cashOnCollection') {
        const discountedPrice = basePrice - (20 * quantity);
        setPrice(discountedPrice);
        setDiscountApplied(true);
      } else {
        setPrice(basePrice);
        setDiscountApplied(false);
      }
    } else if (watchShipmentType === 'other') {
      setOriginalPrice(95);
      setPrice(95);
      setSealCost(0);
      setDoorToDoorCost(0);
      setDiscountApplied(false);
    } else {
      setOriginalPrice(0);
      setPrice(0);
      setSealCost(0);
      setDoorToDoorCost(0);
      setDiscountApplied(false);
    }
  }, [watchShipmentType, watchDrumQuantity, watchPaymentOption, watchWantMetalSeal, watchDoorToDoor, additionalAddresses.length]);

  const goToNextTab = () => {
    if (currentTab === 'sender') {
      if (validateTab('sender')) {
        setCurrentTab('recipient');
      } else {
        toast({
          title: "Missing Information",
          description: "Please fill in all required sender information fields.",
          variant: "destructive",
        });
      }
    } else if (currentTab === 'recipient') {
      if (validateTab('recipient')) {
        setCurrentTab('shipment');
      } else {
        toast({
          title: "Missing Information",
          description: "Please fill in all required recipient information fields.",
          variant: "destructive",
        });
      }
    } else if (currentTab === 'shipment') {
      if (validateTab('shipment')) {
        if (watchShipmentType === 'other' && redirectToCustomQuote) {
          handleCustomQuoteRedirect();
        } else {
          setCurrentTab('payment');
        }
      } else {
        toast({
          title: "Missing Information",
          description: "Please fill in all required shipment details.",
          variant: "destructive",
        });
      }
    }
  };

  const goToPreviousTab = () => {
    if (currentTab === 'payment') setCurrentTab('shipment');
    else if (currentTab === 'shipment') setCurrentTab('recipient');
    else if (currentTab === 'recipient') setCurrentTab('sender');
  };

  const handleCustomQuoteRedirect = () => {
    const data = form.getValues();
    const trackingNumber = `ZIM${Date.now().toString().substring(6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const shipmentId = generateUniqueId('shp_');
    
    // Add additional addresses to form data
    data.additionalDeliveryAddresses = additionalAddresses;
    
    onSubmitComplete({...data, shipmentType: 'other'}, shipmentId, 0);
  };

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    try {
      const trackingNumber = `ZIM${Date.now().toString().substring(6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const shipmentId = generateUniqueId();
      
      // Add additional addresses to form data
      data.additionalDeliveryAddresses = additionalAddresses;
      
      // Calculate total amount with all costs
      const totalAmount = price + sealCost + doorToDoorCost;
      
      const { error } = await supabase.from('shipments').insert({
        id: shipmentId,
        tracking_number: trackingNumber,
        origin: `${data.pickupAddress}, ${data.pickupCountry === 'England' ? data.pickupPostcode : data.pickupCity}`,
        destination: `${data.deliveryAddress}, ${data.deliveryCity}`,
        status: 'pending',
        metadata: {
          ...data,
          shipmentType: data.shipmentType,
          pickupCountry: data.pickupCountry,
          doorToDoor: data.doorToDoor,
          wantMetalSeal: data.wantMetalSeal,
          additionalDeliveryAddresses: data.additionalDeliveryAddresses,
          amountPaid: totalAmount,
          basePrice: price,
          sealCost: sealCost,
          doorToDoorCost: doorToDoorCost
        }
      });
      
      if (error) {
        console.error('Error creating shipment:', error);
        throw error;
      }
      
      onSubmitComplete(data, shipmentId, totalAmount);
    } catch (error: any) {
      console.error('Error submitting booking form:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const validateTab = (tab: string): boolean => {
    const fields: Record<string, string[]> = {
      'sender': ['firstName', 'lastName', 'email', 'phone', 'pickupCountry', 'pickupAddress'],
      'recipient': ['recipientName', 'recipientPhone', 'deliveryAddress', 'deliveryCity'],
      'shipment': ['shipmentType'],
      'payment': ['paymentOption', 'terms']
    };
    
    // Add country-specific fields
    if (watchPickupCountry === 'England') {
      fields.sender.push('pickupPostcode');
    } else if (watchPickupCountry === 'Ireland') {
      fields.sender.push('pickupCity');
    }
    
    const currentFields = fields[tab];
    
    if (!currentFields) {
      return true;
    }
    
    let isValid = true;
    
    currentFields.forEach(field => {
      const fieldValue = form.getValues(field as any);
      if (fieldValue === undefined || fieldValue === '') {
        form.setError(field as any, { 
          type: 'manual', 
          message: `This field is required` 
        });
        isValid = false;
      }
    });
    
    return isValid;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs 
          value={currentTab} 
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="sender" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Sender Information</span>
              <span className="inline md:hidden">Sender</span>
            </TabsTrigger>
            <TabsTrigger value="recipient" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Receiver Information</span>
              <span className="inline md:hidden">Receiver</span>
            </TabsTrigger>
            <TabsTrigger value="shipment" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Shipment Details</span>
              <span className="inline md:hidden">Shipment</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">Payment Method</span>
              <span className="inline md:hidden">Payment</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sender">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sender Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+44 7123 456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="pickupCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pick Up Country *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset pickup postcode/city when country changes
                          if (value === 'England') {
                            form.setValue('pickupCity', '');
                          } else {
                            form.setValue('pickupPostcode', '');
                          }
                        }} 
                        defaultValue={field.value}
                      >
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
              </div>
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pick Up Address *</FormLabel>
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
              </div>
              
              {watchPickupCountry === 'England' ? (
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="pickupPostcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g. SW1A 1AA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="pickupCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {irelandCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {showPostcodeWarning && (
                <Alert className="mt-4 bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-800">Restricted Area</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Your postal code is in a restricted area. Contact our support team to make special arrangements before booking.
                  </AlertDescription>
                </Alert>
              )}
              
              {showCollectionInfo && (
                <CollectionInfo 
                  country={watchPickupCountry}
                  postalCode={watchPickupPostcode}
                  city={watchPickupCity}
                />
              )}
              
              <div className="flex justify-end mt-6">
                <Button 
                  type="button" 
                  onClick={goToNextTab}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next: Recipient
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="recipient">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Receiver Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiver Name *</FormLabel>
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
                      <FormLabel>Receiver Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Phone Number Option */}
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <Checkbox 
                    id="additionalPhone" 
                    checked={hasAdditionalPhone}
                    onCheckedChange={(checked) => {
                      setHasAdditionalPhone(!!checked);
                      if (!checked) {
                        form.setValue('additionalRecipientPhone', '');
                      }
                    }}
                  />
                  <label htmlFor="additionalPhone" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                    Add another receiver phone number
                  </label>
                </div>
                
                {hasAdditionalPhone && (
                  <FormField
                    control={form.control}
                    name="additionalRecipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Address *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter recipient's full address"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="deliveryCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery City *</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Harare" {...field} />
                      </FormControl>
                      <FormDescription>
                        We deliver in major towns and cities except rural areas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={goToPreviousTab}
                >
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={goToNextTab}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next: Shipment
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="shipment">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Shipment Details</h3>
              
              <FormField
                control={form.control}
                name="shipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipment Type *</FormLabel>
                    {renderShipmentTypeOptions()}
                    <FormControl>
                      <input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {watchShipmentType === 'drum' && (
                <>
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="drumQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Drums *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="1000" 
                              step="1" 
                              placeholder="Enter number of drums" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            <div className="text-sm text-gray-500 mt-1">
                              <p className="font-medium">Drum pricing (per drum):</p>
                              <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>1 drum: £280 each</li>
                                <li>2-4 drums: £260 each</li>
                                <li>5+ drums: £240 each</li>
                              </ul>
                              <p className="mt-2 text-green-600 font-semibold">
                                Special offer: £20 discount per drum when selecting "Cash on Collection" payment option!
                              </p>
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Metal Seal Option */}
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="wantMetalSeal"
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
                              Metal Seal (£5 per drum)
                            </FormLabel>
                            <FormDescription>
                              Add metal seal(s) to secure your drums during transit
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Door-to-Door Delivery Option */}
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="doorToDoor"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (!checked) {
                                  setAdditionalAddresses([]);
                                }
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Door-to-Door Delivery (£25 per address)
                            </FormLabel>
                            <FormDescription>
                              Add this option for direct delivery to the recipient's doorstep
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Additional Delivery Addresses */}
                  {watchDoorToDoor && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Additional Delivery Addresses</h4>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={addNewDeliveryAddress}
                          className="flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Address
                        </Button>
                      </div>
                      
                      {additionalAddresses.length > 0 ? (
                        <div className="space-y-4">
                          {additionalAddresses.map((address, index) => (
                            <div key={index} className="p-4 border rounded-md relative">
                              <Button 
                                type="button" 
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-2 h-6 w-6"
                                onClick={() => removeDeliveryAddress(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <h5 className="font-medium mb-3 text-sm">Delivery Address #{index + 1}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                  <label className="text-sm font-medium mb-1 block">Recipient Name *</label>
                                  <Input 
                                    value={address.recipientName} 
                                    onChange={(e) => updateDeliveryAddress(index, 'recipientName', e.target.value)} 
                                    placeholder="Full Name"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">Recipient Phone *</label>
                                  <Input 
                                    value={address.recipientPhone} 
                                    onChange={(e) => updateDeliveryAddress(index, 'recipientPhone', e.target.value)} 
                                    placeholder="Phone Number"
                                  />
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="text-sm font-medium mb-1 block">Address *</label>
                                <Textarea 
                                  value={address.address} 
                                  onChange={(e) => updateDeliveryAddress(index, 'address', e.target.value)} 
                                  placeholder="Full Address"
                                  className="resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">City *</label>
                                <Input 
                                  value={address.city} 
                                  onChange={(e) => updateDeliveryAddress(index, 'city', e.target.value)} 
                                  placeholder="City"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No additional addresses added</p>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {watchShipmentType === 'other' && (
                <div className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="itemCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Category *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedCategory(value);
                            form.setValue('specificItem', '');
                            form.setValue('otherItemDescription', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="furniture">Furniture</SelectItem>
                            <SelectItem value="appliances">Appliances</SelectItem>
                            <SelectItem value="garden">Garden Items</SelectItem>
                            <SelectItem value="transportation">Transportation</SelectItem>
                            <SelectItem value="household">Household Items</SelectItem>
                            <SelectItem value="mobility">Mobility Aids</SelectItem>
                            <SelectItem value="storage">Storage Items</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="building">Building Materials</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedCategory && (
                    <FormField
                      control={form.control}
                      name="specificItem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Item *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value === 'Other') {
                                form.setValue('otherItemDescription', '');
                              }
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select specific item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedCategory && itemCategories[selectedCategory as keyof typeof itemCategories]?.map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {watchSpecificItem === 'Other' && (
                    <FormField
                      control={form.control}
                      name="otherItemDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please describe your item in detail"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              {watchShipmentType === 'drum' && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Base Shipping Cost:</span>
                    {discountApplied ? (
                      <div className="text-right">
                        <span className="text-xl font-bold">£{price}</span>
                        <span className="text-sm text-gray-500 line-through ml-2">£{originalPrice}</span>
                      </div>
                    ) : (
                      <span className="text-xl font-bold">£{price}</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-3 space-y-2">
                    <div className="flex justify-between">
                      <span>Metal seals ({watchWantMetalSeal ? parseInt(watchDrumQuantity || '1') : 0} x £5):</span>
                      <span>£{sealCost}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Door-to-door delivery ({watchDoorToDoor ? 1 + additionalAddresses.length : 0} x £25):</span>
                      <span>£{doorToDoorCost}</span>
                    </div>
                    
                    <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                      <span>Total:</span>
                      <span>£{price + sealCost + doorToDoorCost}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={goToPreviousTab}
                >
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={goToNextTab}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  {(watchShipmentType === 'other' && redirectToCustomQuote) ? 'Request Custom Quote' : 'Next: Payment'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              
              <FormField
                control={form.control}
                name="paymentOption"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-4 mt-2"
                      >
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'standard' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="standard" id="standard" />
                            <FormLabel htmlFor="standard" className="cursor-pointer font-medium">Standard Payment</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Make a payment instantly with card or PayPal</p>
                        </div>
                        
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'cashOnCollection' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                            <FormLabel htmlFor="cashOnCollection" className="cursor-pointer font-medium">Cash on Collection</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Pay cash when we collect your shipment (£20 discount per drum)</p>
                        </div>
                        
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'payOnArrival' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="payOnArrival" id="payOnArrival" />
                            <FormLabel htmlFor="payOnArrival" className="cursor-pointer font-medium">Pay on Arrival</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Pay when your shipment arrives at destination</p>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="terms"
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
                          I agree to the <a href="/terms-and-conditions" target="_blank" className="text-zim-green hover:underline">terms and conditions</a> *
                        </FormLabel>
                        <FormDescription>
                          By checking this box, you agree to our terms of service and privacy policy.
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={goToPreviousTab}
                >
                  Back
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting || !form.getValues('terms')}
                  className="bg-zim-green hover:bg-zim-green/90 w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Complete Booking'
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
};

export default BookingFormNew;
