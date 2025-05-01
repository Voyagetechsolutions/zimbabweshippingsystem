
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Loader2, Plus, User, Users, Package, CreditCard, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getRouteForPostalCode, isRestrictedPostalCode, getIrelandRouteForCity } from '@/utils/postalCodeUtils';
import { generateUniqueId } from '@/lib/utils';
import { getDateByRoute, getIrelandCities } from '@/data/collectionSchedule';
import CollectionInfo from '@/components/CollectionInfo';
import { PaymentMethodSection } from '@/components/PaymentMethodSection';
import { isValidEmail, isValidPhoneNumber } from '@/utils/formValidation';

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
  
  includeDrums: z.boolean().default(false),
  includeOtherItems: z.boolean().default(false),
  
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
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
      includeDrums: false,
      includeOtherItems: false,
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
    mode: 'onBlur',
  });

  const watchIncludeDrums = form.watch('includeDrums');
  const watchIncludeOtherItems = form.watch('includeOtherItems');
  const watchPaymentOption = form.watch('paymentOption');
  const watchPickupPostcode = form.watch('pickupPostcode');
  const watchPickupCountry = form.watch('pickupCountry');
  const watchPickupCity = form.watch('pickupCity');
  const watchDrumQuantity = form.watch('drumQuantity');
  const watchWantMetalSeal = form.watch('wantMetalSeal');
  const watchDoorToDoor = form.watch('doorToDoor');
  const watchItemCategory = form.watch('itemCategory');
  const watchSpecificItem = form.watch('specificItem');
  const watchTerms = form.watch('terms');

  const renderShipmentTypeOptions = () => {
    return (
      <div className="grid grid-cols-1 gap-4 mt-2">
        <div className="flex flex-col space-y-2">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="includeDrums" 
              checked={form.getValues('includeDrums')}
              onCheckedChange={(checked) => {
                form.setValue('includeDrums', checked === true);
                if (checked && !form.getValues('drumQuantity')) {
                  form.setValue('drumQuantity', '1');
                }
              }}
            />
            <div>
              <label 
                htmlFor="includeDrums" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Drums (Standard 220L)
              </label>
              <p className="text-sm text-gray-500 mt-1">Standard size drums (200L-220L) for goods</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="includeOtherItems" 
              checked={form.getValues('includeOtherItems')}
              onCheckedChange={(checked) => {
                form.setValue('includeOtherItems', checked === true);
              }}
            />
            <div>
              <label 
                htmlFor="includeOtherItems" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Other Items
              </label>
              <p className="text-sm text-gray-500 mt-1">Other items requiring a custom quote</p>
            </div>
          </div>
        </div>
        
        {(!form.getValues('includeDrums') && !form.getValues('includeOtherItems')) && (
          <div className="mt-2 text-amber-600 text-sm">
            Please select at least one shipping option
          </div>
        )}
      </div>
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
    if (watchIncludeOtherItems && !watchIncludeDrums && 
        watchItemCategory && 
        (watchSpecificItem || form.getValues('otherItemDescription'))) {
      setRedirectToCustomQuote(true);
    } else {
      setRedirectToCustomQuote(false);
    }
  }, [watchIncludeDrums, watchIncludeOtherItems, watchItemCategory, watchSpecificItem, form]);

  useEffect(() => {
    let basePrice = 0;
    
    if (watchIncludeDrums) {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      
      if (quantity === 1) {
        basePrice = 280;
      } else if (quantity >= 2 && quantity <= 4) {
        basePrice = 260 * quantity;
      } else if (quantity >= 5) {
        basePrice = 240 * quantity;
      } else {
        basePrice = 280;
      }
      
      const sealPrice = watchWantMetalSeal ? 5 * quantity : 0;
      setSealCost(sealPrice);
    } else {
      setSealCost(0);
    }
    
    setOriginalPrice(basePrice);
    
    const addressCount = watchDoorToDoor ? 1 + additionalAddresses.length : 0;
    const doorCost = addressCount * 25;
    setDoorToDoorCost(doorCost);
    
    if (watchPaymentOption === 'cashOnCollection' && watchIncludeDrums) {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      const discountedPrice = basePrice - (20 * quantity);
      setPrice(discountedPrice);
      setDiscountApplied(true);
    } else {
      setPrice(basePrice);
      setDiscountApplied(false);
    }
  }, [watchIncludeDrums, watchDrumQuantity, watchPaymentOption, watchWantMetalSeal, watchDoorToDoor, additionalAddresses.length]);

  const goToNextTab = () => {
    if (currentTab === 'sender') {
      if (validateTab('sender')) {
        setCurrentTab('recipient');
        setValidationErrors({});
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
        setValidationErrors({});
      } else {
        toast({
          title: "Missing Information",
          description: "Please fill in all required recipient information fields.",
          variant: "destructive",
        });
      }
    } else if (currentTab === 'shipment') {
      if (validateTab('shipment')) {
        setValidationErrors({});
        // If only other items and no drums selected, redirect to custom quote
        if (!watchIncludeDrums && watchIncludeOtherItems && redirectToCustomQuote) {
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
    } else if (currentTab === 'payment') {
      if (validateTab('payment')) {
        setValidationErrors({});
        handleFormSubmit();
      } else {
        toast({
          title: "Missing Information",
          description: "Please agree to the terms and conditions before proceeding.",
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
    
    data.additionalDeliveryAddresses = additionalAddresses;
    
    onSubmitComplete({...data}, shipmentId, 0);
  };

  const handlePaymentComplete = (paymentData: any) => {
    // Submit the form with the payment data
    onSubmit(form.getValues());
  };

  const handleFormSubmit = () => {
    const isValid = form.trigger();
    
    if (isValid) {
      onSubmit(form.getValues());
    } else {
      validateAllTabs();
      
      // Find which tab has errors and switch to it
      const errors = form.formState.errors;
      const senderFields = ['firstName', 'lastName', 'email', 'phone', 'pickupCountry', 'pickupAddress', 'pickupPostcode', 'pickupCity'];
      const recipientFields = ['recipientName', 'recipientPhone', 'deliveryAddress', 'deliveryCity', 'additionalRecipientPhone'];
      const shipmentFields = ['includeDrums', 'includeOtherItems', 'drumQuantity', 'itemCategory', 'specificItem', 'otherItemDescription'];
      const paymentFields = ['paymentOption', 'paymentMethod', 'terms'];
      
      const tabsWithErrors = {
        sender: senderFields.some(field => errors[field as keyof typeof errors]),
        recipient: recipientFields.some(field => errors[field as keyof typeof errors]),
        shipment: shipmentFields.some(field => errors[field as keyof typeof errors]),
        payment: paymentFields.some(field => errors[field as keyof typeof errors]),
      };
      
      if (tabsWithErrors.sender) {
        setCurrentTab('sender');
      } else if (tabsWithErrors.recipient) {
        setCurrentTab('recipient');
      } else if (tabsWithErrors.shipment) {
        setCurrentTab('shipment');
      } else if (tabsWithErrors.payment) {
        setCurrentTab('payment');
      }
    }
  };

  const validateAllTabs = () => {
    // Force validation on all fields
    validateTab('sender');
    validateTab('recipient');
    validateTab('shipment');
    validateTab('payment');
  };

  const onSubmit = async (data: BookingFormValues) => {
    // Validate that at least one shipment type is selected
    if (!data.includeDrums && !data.includeOtherItems) {
      toast({
        title: "Missing Information",
        description: "Please select at least one shipment type (Drums or Other Items).",
        variant: "destructive",
      });
      setCurrentTab('shipment');
      return;
    }
    
    // Check terms
    if (!data.terms) {
      toast({
        title: "Terms and Conditions",
        description: "You must agree to the terms and conditions to proceed.",
        variant: "destructive",
      });
      setCurrentTab('payment');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const trackingNumber = `ZIM${Date.now().toString().substring(6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const shipmentId = generateUniqueId();
      
      data.additionalDeliveryAddresses = additionalAddresses;
      
      const { error } = await supabase.from('shipments').insert({
        id: shipmentId,
        tracking_number: trackingNumber,
        origin: `${data.pickupAddress}, ${data.pickupCountry === 'England' ? data.pickupPostcode : data.pickupCity}`,
        destination: `${data.deliveryAddress}, ${data.deliveryCity}`,
        status: 'pending',
        metadata: {
          ...data,
          includeDrums: data.includeDrums,
          includeOtherItems: data.includeOtherItems,
          pickupCountry: data.pickupCountry,
          doorToDoor: data.doorToDoor,
          wantMetalSeal: data.wantMetalSeal,
          additionalDeliveryAddresses: data.additionalDeliveryAddresses,
          amountPaid: price,
          basePrice: price,
          sealCost: sealCost,
          doorToDoorCost: doorToDoorCost
        }
      });
      
      if (error) {
        console.error('Error creating shipment:', error);
        throw error;
      }
      
      onSubmitComplete(data, shipmentId, price);
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
      'shipment': [],
      'payment': ['terms']
    };
    
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
    const errors: Record<string, string[]> = {};
    
    currentFields.forEach(field => {
      const fieldValue = form.getValues(field as any);
      if (fieldValue === undefined || fieldValue === '' || (field === 'terms' && fieldValue !== true)) {
        form.setError(field as any, { 
          type: 'manual', 
          message: `This field is required` 
        });
        
        if (!errors[tab]) errors[tab] = [];
        errors[tab].push(`${field} is required`);
        
        isValid = false;
      } else if (field === 'email' && !isValidEmail(fieldValue)) {
        form.setError(field as any, {
          type: 'manual',
          message: 'Please enter a valid email address'
        });
        
        if (!errors[tab]) errors[tab] = [];
        errors[tab].push(`Email is invalid`);
        
        isValid = false;
      } else if ((field === 'phone' || field === 'recipientPhone') && !isValidPhoneNumber(fieldValue)) {
        form.setError(field as any, {
          type: 'manual',
          message: 'Please enter a valid phone number'
        });
        
        if (!errors[tab]) errors[tab] = [];
        errors[tab].push(`Phone number is invalid`);
        
        isValid = false;
      }
    });
    
    if (tab === 'shipment') {
      // Make sure at least one option is selected
      if (!watchIncludeDrums && !watchIncludeOtherItems) {
        isValid = false;
        
        if (!errors[tab]) errors[tab] = [];
        errors[tab].push(`Select at least one shipment type`);
        
        toast({
          title: "Missing Information",
          description: "Please select at least one shipment type (Drums or Other Items).",
          variant: "destructive",
        });
      }
      
      // Check required fields based on selection
      if (watchIncludeDrums && (!watchDrumQuantity || parseInt(watchDrumQuantity || '0') < 1)) {
        isValid = false;
        form.setError('drumQuantity', {
          type: 'manual',
          message: 'Please enter the number of drums'
        });
        
        if (!errors[tab]) errors[tab] = [];
        errors[tab].push(`Drum quantity is required`);
      }
      
      if (watchIncludeOtherItems) {
        if (!watchItemCategory) {
          isValid = false;
          form.setError('itemCategory', {
            type: 'manual',
            message: 'Please select a category'
          });
          
          if (!errors[tab]) errors[tab] = [];
          errors[tab].push(`Item category is required`);
        } else if (watchItemCategory !== 'other' && !watchSpecificItem) {
          isValid = false;
          form.setError('specificItem', {
            type: 'manual',
            message: 'Please select a specific item'
          });
          
          if (!errors[tab]) errors[tab] = [];
          errors[tab].push(`Specific item is required`);
        } else if (watchSpecificItem === 'Other' && !form.getValues('otherItemDescription')) {
          isValid = false;
          form.setError('otherItemDescription', {
            type: 'manual',
            message: 'Please provide a description'
          });
          
          if (!errors[tab]) errors[tab] = [];
          errors[tab].push(`Item description is required`);
        }
      }
      
      // Validate additional addresses if door-to-door is selected
      if (watchDoorToDoor && additionalAddresses.length > 0) {
        additionalAddresses.forEach((address, index) => {
          if (!address.address || address.address.length < 5) {
            isValid = false;
            if (!errors[tab]) errors[tab] = [];
            errors[tab].push(`Address ${index + 1} is incomplete`);
          }
          
          if (!address.city || address.city.length < 2) {
            isValid = false;
            if (!errors[tab]) errors[tab] = [];
            errors[tab].push(`City for address ${index + 1} is required`);
          }
          
          if (!address.recipientName || address.recipientName.length < 2) {
            isValid = false;
            if (!errors[tab]) errors[tab] = [];
            errors[tab].push(`Recipient name for address ${index + 1} is required`);
          }
          
          if (!address.recipientPhone || !isValidPhoneNumber(address.recipientPhone)) {
            isValid = false;
            if (!errors[tab]) errors[tab] = [];
            errors[tab].push(`Valid phone number for address ${index + 1} is required`);
          }
        });
      }
    }
    
    if (tab === 'payment' && !watchTerms) {
      isValid = false;
      form.setError('terms', {
        type: 'manual',
        message: 'You must agree to the terms and conditions'
      });
      
      if (!errors[tab]) errors[tab] = [];
      errors[tab].push('Agreement to terms and conditions is required');
    }
    
    setValidationErrors(prev => ({...prev, ...errors}));
    
    return isValid;
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-8">
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

          {validationErrors[currentTab] && validationErrors[currentTab].length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2">
                  {validationErrors[currentTab].map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

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
              
              <div className="mb-6">
                <FormLabel className="block mb-3">What would you like to ship? *</FormLabel>
                {renderShipmentTypeOptions()}
              </div>
              
              {watchIncludeDrums && (
                <div className="border-t pt-6 mb-6">
                  <h4 className="font-medium text-lg mb-4">Drum Details</h4>
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
                              <div className="font-medium">Pricing Per Drum:</div>
                              <ul className="list-disc pl-5 mt-1">
                                <li>1 Drum: £280 each</li>
                                <li>2-4 Drums: £260 each</li>
                                <li>5+ Drums: £240 each</li>
                              </ul>
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
                      name="wantMetalSeal"
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
                              Add Metal coded Seal (£5 per drum)
                            </FormLabel>
                            <FormDescription>
                              Metal coded seals provide extra security for your shipment
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="doorToDoor"
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
                              Door-to-Door Delivery (£25 per address)
                            </FormLabel>
                            <FormDescription>
                              We'll deliver directly to the recipient's door
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {watchDoorToDoor && (
                    <>
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Additional Delivery Addresses</h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Each additional address incurs a £25 delivery fee
                        </p>
                        
                        {additionalAddresses.map((address, index) => (
                          <div key={index} className="mb-4 p-4 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium">Address #{index + 1}</h5>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeDeliveryAddress(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium block mb-1">Recipient Name</label>
                                <Input
                                  value={address.recipientName}
                                  onChange={(e) => updateDeliveryAddress(index, 'recipientName', e.target.value)}
                                  placeholder="Recipient Name"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium block mb-1">Recipient Phone Number</label>
                                <Input
                                  value={address.recipientPhone}
                                  onChange={(e) => updateDeliveryAddress(index, 'recipientPhone', e.target.value)}
                                  placeholder="Phone Number"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium block mb-1">Delivery Address</label>
                                <Textarea
                                  value={address.address}
                                  onChange={(e) => updateDeliveryAddress(index, 'address', e.target.value)}
                                  placeholder="Full Address"
                                  className="resize-none"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium block mb-1">City</label>
                                <Input
                                  value={address.city}
                                  onChange={(e) => updateDeliveryAddress(index, 'city', e.target.value)}
                                  placeholder="City"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addNewDeliveryAddress}
                          className="w-full mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Another Address
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {watchIncludeOtherItems && (
                <div className={`${watchIncludeDrums ? 'border-t pt-6' : ''} mb-6`}>
                  <h4 className="font-medium text-lg mb-4">Other Item Details</h4>
                  <div className="mt-4">
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
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.keys(itemCategories).map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {selectedCategory && (
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="specificItem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specific Item *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {selectedCategory && itemCategories[selectedCategory as keyof typeof itemCategories].map((item) => (
                                  <SelectItem key={item} value={item}>
                                    {item}
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
                  
                  {watchSpecificItem === 'Other Item' && (
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="otherItemDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Please provide a detailed description of your item"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Include dimensions, weight, and any other relevant details
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t flex justify-between">
                <div>
                  {watchIncludeDrums && (
                    <>
                      <h4 className="font-medium">Estimated Cost</h4>
                      <div className="text-2xl font-bold mt-2 text-zim-green">
                        £{(price + sealCost + doorToDoorCost).toFixed(2)}
                      </div>
                      {discountApplied && (
                        <div className="mt-1 text-sm text-green-600">
                          Includes £{(originalPrice - price).toFixed(2)} savings!
                        </div>
                      )}
                    </>
                  )}
                  {watchIncludeOtherItems && !watchIncludeDrums && (
                    <div className="text-md">
                      Custom quote will be provided after submission
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-3">
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
                    {(!watchIncludeDrums && watchIncludeOtherItems) ? 'Request Quote' : 'Next: Payment'}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="payment">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment & Terms</h3>
              
              <PaymentMethodSection
                bookingData={{
                  shipmentDetails: {
                    type: watchIncludeDrums ? 'drum' : 'other',
                    quantity: parseInt(watchDrumQuantity || '1'),
                    services: [
                      ...(watchWantMetalSeal && watchIncludeDrums ? [{
                        name: `Metal Seal${parseInt(watchDrumQuantity || '1') > 1 ? 's' : ''} (${parseInt(watchDrumQuantity || '1')} x £5)`,
                        price: sealCost
                      }] : []),
                      ...(watchDoorToDoor ? [{
                        name: `Door to Door Delivery (${1 + additionalAddresses.length} address${(1 + additionalAddresses.length) > 1 ? 'es' : ''})`,
                        price: doorToDoorCost
                      }] : [])
                    ],
                  }
                }}
                totalAmount={price + sealCost + doorToDoorCost}
                onCancel={goToPreviousTab}
                onComplete={handlePaymentComplete}
              />
              
              {/*<div className="mt-6 border-t pt-6">
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
                          I agree to the <a href="/terms" target="_blank" className="text-blue-600 hover:underline">Terms & Conditions</a>*
                        </FormLabel>
                        <FormDescription>
                          By checking this box, you agree to our terms of service and privacy policy.
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>*/}
              
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
                  className="bg-zim-green hover:bg-zim-green/90"
                  disabled={isSubmitting || !watchTerms}
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
