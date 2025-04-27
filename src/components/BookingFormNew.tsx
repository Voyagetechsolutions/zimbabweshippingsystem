import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoIcon, Loader2, PackageCheck, Truck, User, Users, Package, CreditCard, Plus, Trash } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { getRouteForPostalCode, isRestrictedPostalCode, getIrelandRouteForCity } from '@/utils/postalCodeUtils';
import { generateUniqueId } from '@/lib/utils';
import { getDateByRoute, getIrelandCities } from '@/data/collectionSchedule';
import CollectionInfo from '@/components/CollectionInfo';

const bookingFormSchema = z.object({
  // Sender information
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  pickupCountry: z.string().min(1, { message: 'Please select a country' }),
  pickupAddress: z.string().min(5, { message: 'Please enter a valid address' }),
  pickupCity: z.string().optional(),
  pickupPostcode: z.string().optional(),
  
  // Recipient information
  recipientName: z.string().min(2, { message: 'Recipient name must be at least 2 characters' }),
  recipientPhone: z.string().min(10, { message: 'Please enter a valid phone number' }),
  additionalPhone: z.string().optional(),
  deliveryAddress: z.string().min(5, { message: 'Please enter a valid address' }),
  deliveryCity: z.string().min(2, { message: 'Please enter a valid city' }),
  deliveryAddresses: z.array(
    z.object({
      address: z.string().min(5, { message: 'Please enter a valid address' }),
      city: z.string().min(2, { message: 'Please enter a valid city' }),
    })
  ).optional(),
  
  // Shipment details
  shipmentType: z.enum(['drum', 'other']),
  drumQuantity: z.string().optional(),
  needMetalSeals: z.boolean().default(false),
  
  itemCategory: z.string().optional(),
  itemDescription: z.string().optional(),
  doorToDoor: z.boolean().default(false),
  
  // Payment details
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

const itemCategories = [
  { value: 'furniture', label: 'Furniture', items: [
    'Sofa', 'Chair', 'Dining Table and Chairs', 'Coffee Table', 'Bed', 'Mattress', 
    'Dismantled Wardrobe', 'Chest of Drawers', 'Dressing Unit', 'Home Furniture', 'Office Furniture'
  ]},
  { value: 'appliances', label: 'Appliances', items: [
    'Washing Machine', 'Dishwasher', 'Dryer', 'American Fridge', 'Standard Fridge', 
    'Freezer', 'Deep Freezer', 'TV'
  ]},
  { value: 'outdoor', label: 'Outdoor/Garden', items: [
    'Garden Tools', 'Lawn Mower', 'Trampoline', 'Ladder'
  ]},
  { value: 'mobility', label: 'Mobility Aids', items: [
    'Wheelchair', 'Adult Walking Aid', 'Mobility Scooter', 'Kids Push Chair'
  ]},
  { value: 'automotive', label: 'Automotive', items: [
    'Car Wheels/Tyres', 'Vehicle Parts', 'Engines'
  ]},
  { value: 'household', label: 'Household Items', items: [
    'Bicycle', 'Bin', 'Plastic Tubs', 'Ironing Board', 'Rugs', 'Carpets', 'Internal Doors',
    'External Doors', 'Wall Frame', 'Mirrors', 'Bathroom Equipment'
  ]},
  { value: 'equipment', label: 'Equipment', items: [
    'Tool Box', 'Air Compressor', 'Generator', 'Solar Panel', 'Water Pump', 'Pool Pump',
    'Heater', 'Air Conditioner'
  ]},
  { value: 'containers', label: 'Containers & Bags', items: [
    'Boxes', 'Bags', 'Suitcase', 'Pallets', 'Amazon Bag', 'China Bags'
  ]},
  { value: 'construction', label: 'Construction', items: [
    'Building Materials', 'Home Deco'
  ]},
  { value: 'other', label: 'Other', items: ['Other']}
];

const BookingFormNew: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showPostcodeWarning, setShowPostcodeWarning] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [showCollectionInfo, setShowCollectionInfo] = useState(false);
  const [irelandCities, setIrelandCities] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('sender');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryItems, setCategoryItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const navigate = useNavigate();
  
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
      additionalPhone: '',
      deliveryAddress: '',
      deliveryCity: '',
      shipmentType: 'drum',
      drumQuantity: '1',
      needMetalSeals: false,
      itemCategory: '',
      itemDescription: '',
      doorToDoor: false,
      deliveryAddresses: [],
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
  const watchNeedMetalSeals = form.watch('needMetalSeals');
  const watchDoorToDoor = form.watch('doorToDoor');
  const watchDeliveryAddresses = form.watch('deliveryAddresses') || [];

  useEffect(() => {
    if (selectedCategory) {
      const category = itemCategories.find(cat => cat.value === selectedCategory);
      setCategoryItems(category?.items || []);
      setSelectedItem('');
    } else {
      setCategoryItems([]);
    }
  }, [selectedCategory]);

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
            form.setValue('itemDescription', '');
          } else if (value === 'other') {
            form.setValue('drumQuantity', '1');
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
            form.setValue('itemDescription', '');
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
            form.setValue('drumQuantity', '1');
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
      setDiscountApplied(false);
    } else {
      setOriginalPrice(0);
      setPrice(0);
      setDiscountApplied(false);
    }
  }, [watchShipmentType, watchDrumQuantity, watchPaymentOption]);

  const goToNextTab = () => {
    if (currentTab === 'sender') setCurrentTab('recipient');
    else if (currentTab === 'recipient') setCurrentTab('shipment');
    else if (currentTab === 'shipment') {
      setCurrentTab('payment');
    }
  };

  const goToPreviousTab = () => {
    if (currentTab === 'payment') setCurrentTab('shipment');
    else if (currentTab === 'shipment') setCurrentTab('recipient');
    else if (currentTab === 'recipient') setCurrentTab('sender');
  };

  const addDeliveryAddress = () => {
    const currentAddresses = form.getValues('deliveryAddresses') || [];
    form.setValue('deliveryAddresses', [
      ...currentAddresses,
      { address: '', city: '' }
    ]);
  };

  const removeDeliveryAddress = (index: number) => {
    const currentAddresses = [...watchDeliveryAddresses];
    currentAddresses.splice(index, 1);
    form.setValue('deliveryAddresses', currentAddresses);
  };

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    try {
      const trackingNumber = `ZIM${Date.now().toString().substring(6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const shipmentId = generateUniqueId();
      
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
          amountPaid: price,
          itemCategory: selectedCategory,
          specificItem: selectedItem,
        },
        user_id: (await supabase.auth.getUser()).data.user?.id
      });
      
      if (error) {
        console.error('Error creating shipment:', error);
        throw error;
      }
      
      // Store driver collection data in shipments table instead with a specific status
      try {
        // Create a shipping record for driver collection
        await supabase.from('shipments').insert({
          id: generateUniqueId(),
          tracking_number: `DC-${trackingNumber}`,
          origin: `${data.pickupAddress}, ${data.pickupCountry === 'England' ? data.pickupPostcode : data.pickupCity}`,
          destination: `${data.deliveryAddress}, ${data.deliveryCity}`,
          status: 'pending_collection',
          metadata: {
            shipment_id: shipmentId,
            customer_name: `${data.firstName} ${data.lastName}`,
            contact_number: data.phone,
            shipment_type: data.shipmentType,
            notes: data.shipmentType === 'drum' ? `${data.drumQuantity} drum(s)` : 'Custom item',
            pickup_date: new Date().toISOString().split('T')[0],
            collection_type: 'driver',
          },
          user_id: (await supabase.auth.getUser()).data.user?.id
        }).then(null, err => {
          // Log but don't throw to allow the booking to continue
          console.error('Failed to create driver collection record:', err);
        });
      } catch (err) {
        console.error('Failed to add to driver collections:', err);
      }
      
      onSubmitComplete(data, shipmentId, price);
    } catch (error) {
      console.error('Error submitting booking form:', error);
      setIsSubmitting(false);
    }
  };

  const validateTab = (tab: string): boolean => {
    const fields = {
      sender: ['firstName', 'lastName', 'email', 'phone', 'pickupCountry', 'pickupAddress'],
      recipient: ['recipientName', 'recipientPhone', 'deliveryAddress', 'deliveryCity'],
      shipment: ['shipmentType'],
      payment: ['paymentOption', 'terms']
    };
    
    const tabKey = tab as keyof typeof fields;
    const currentFields = fields[tabKey];
    
    if (!currentFields) {
      console.warn(`No validation fields defined for tab: ${tab}`);
      return true;
    }
    
    return currentFields.every(field => {
      const fieldValue = form.getValues(field as any);
      return fieldValue !== undefined && fieldValue !== '';
    });
  };
  
  const calculateAdditionalCosts = () => {
    const drumCount = parseInt(watchDrumQuantity || '1', 10);
    const metalSealsCount = watchNeedMetalSeals ? drumCount : 0;
    const metalSealsCost = metalSealsCount * 5;
    const doorToDoorCost = watchDoorToDoor ? 25 * Math.max(1, watchDeliveryAddresses.length) : 0;
    
    return { metalSealsCost, doorToDoorCost };
  };
  
  const { metalSealsCost, doorToDoorCost } = calculateAdditionalCosts();
  const totalCost = price + metalSealsCost + doorToDoorCost;

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
            <Card className="p-4 sm:p-6">
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
                        onValueChange={field.onChange} 
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
                  <InfoIcon className="h-4 w-4 text-amber-500" />
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
                  disabled={!validateTab('sender')}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next: Recipient
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="recipient">
            <Card className="p-4 sm:p-6">
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
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="additionalPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        We deliver in major towns and cities except rural areas.
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
                  disabled={!validateTab('recipient')}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next: Shipment
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="shipment">
            <Card className="p-4 sm:p-6">
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
                  
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="needMetalSeals"
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
                              Metal Seals (£5 per drum)
                            </FormLabel>
                            <FormDescription>
                              Add metal seals for security (one seal per drum)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              {watchShipmentType === 'other' && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Category *
                      </label>
                      <Select 
                        onValueChange={(value) => {
                          setSelectedCategory(value);
                          form.setValue('itemCategory', value);
                        }}
                        value={selectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCategory && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specific Item *
                        </label>
                        <Select 
                          onValueChange={(value) => {
                            setSelectedItem(value);
                            form.setValue('itemDescription', value);
                          }}
                          value={selectedItem}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryItems.map(item => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {selectedItem === 'Other' && (
                    <div>
                      <FormField
                        control={form.control}
                        name="itemDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your item in detail"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
              
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
                              form.setValue('deliveryAddresses', []);
                            }
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Door-to-Door Delivery (£25 per address)
                        </FormLabel>
                        <FormDescription>
                          Add this option for direct delivery to multiple recipient addresses
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              {watchDoorToDoor && (
                <div className="mt-4 border p-4 rounded-md">
                  <h4 className="font-medium mb-2">Additional Delivery Addresses</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Add additional delivery addresses (£25 charge per address)
                  </p>
                  
                  {watchDeliveryAddresses.map((address, index) => (
                    <div key={index} className="mb-4 p-3 border rounded-md relative">
                      <button
                        type="button"
                        onClick={() => removeDeliveryAddress(index)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address {index + 1} *
                          </label>
                          <Input
                            placeholder="Enter address"
                            value={address.address}
                            onChange={(e) => {
                              const updatedAddresses = [...watchDeliveryAddresses];
                              updatedAddresses[index] = {
                                ...updatedAddresses[index],
                                address: e.target.value,
                              };
                              form.setValue('deliveryAddresses', updatedAddresses);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                          </label>
                          <Input
                            placeholder="Enter city"
                            value={address.city}
                            onChange={(e) => {
                              const updatedAddresses = [...watchDeliveryAddresses];
                              updatedAddresses[index] = {
                                ...updatedAddresses[index],
                                city: e.target.value,
                              };
                              form.setValue('deliveryAddresses', updatedAddresses);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addDeliveryAddress}
                    className="w-full mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Address
                  </Button>
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
                  
                  <div className="text-sm text-gray-500 mt-1">
                    <p>Additional costs:</p>
                    <ul className="list-disc pl-5">
                      {watchNeedMetalSeals && (
                        <li>Metal seal{parseInt(watchDrumQuantity || '1') > 1 ? 's' : ''} (£5 x {watchDrumQuantity || 1}): 
                          £{metalSealsCost}
                        </li>
                      )}
                      {watchDoorToDoor && (
                        <li>Door-to-door delivery ({Math.max(watchDeliveryAddresses.length, 1)} address{watchDeliveryAddresses.length !== 1 ? 'es' : ''}): 
                          £{doorToDoorCost}
                        </li>
                      )}
                    </ul>
                    <p className="font-medium mt-2 text-base">
                      Total: £{totalCost}
                    </p>
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
                  disabled={!validateTab('shipment') || (watchShipmentType === 'other' && (!selectedCategory || !selectedItem))}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next: Payment
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card className="p-4 sm:p-6">
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
                        className="grid grid-cols-1 gap-4 mt-2"
                      >
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'standard' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="standard" id="standard" />
                            <FormLabel htmlFor="standard" className="cursor-pointer font-medium">Standard Payment</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Make a payment instantly, within 30 days, pay when goods arrive or pay at collection</p>
                        </div>
                        
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'cashOnCollection' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                            <FormLabel htmlFor="cashOnCollection" className="cursor-pointer font-medium">Cash on Collection</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Pay with cash when your items are collected (£20 discount per drum)</p>
                        </div>
                        
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'payOnArrival' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="payOnArrival" id="payOnArrival" />
                            <FormLabel htmlFor="payOnArrival" className="cursor-pointer font-medium">Pay on Arrival</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Pay when your items arrive at their destination</p>
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
                          I agree to the <Link to="/terms-and-conditions" className="text-zim-green hover:underline" target="_blank" rel="noopener noreferrer">terms and conditions</Link> *
                        </FormLabel>
                        <FormDescription>
                          By checking this box, you agree to our <Link to="/terms-and-conditions" className="text-zim-green hover:underline" target="_blank" rel="noopener noreferrer">terms of service</Link> and <Link to="/privacy-policy" className="text-zim-green hover:underline" target="_blank" rel="noopener noreferrer">privacy policy</Link>.
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
                  disabled={isSubmitting || !validateTab('payment')}
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
