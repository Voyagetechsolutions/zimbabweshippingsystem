import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, Plus, Minus, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  getRouteNames, 
  getAreasByRoute, 
  getDateByRoute, 
  getAreasFromPostalCode,
  getRouteForIrelandCity,
  getDateForIrelandCity
} from '@/data/collectionSchedule';
import { postalCodeToRouteMap, restrictedPostalCodes } from '@/utils/postalCodeUtils';
import { IrelandCitySelector } from './IrelandCitySelector';

// Define the form schema with Zod
const bookingFormSchema = z.object({
  // Sender details
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  
  // Pickup details
  pickupAddress: z.string().min(5, { message: "Address must be at least 5 characters" }),
  pickupCity: z.string().optional(),
  pickupPostcode: z.string().optional(),
  pickupCountry: z.string(),
  
  // Recipient details
  recipientName: z.string().min(2, { message: "Recipient name must be at least 2 characters" }),
  recipientPhone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  additionalRecipientPhone: z.string().optional(),
  deliveryAddress: z.string().min(5, { message: "Delivery address must be at least 5 characters" }),
  deliveryCity: z.string().min(2, { message: "City must be at least 2 characters" }),
  
  // Shipment details
  shipmentType: z.enum(["drum", "parcel", "other"]),
  includeDrums: z.boolean().optional(),
  drumQuantity: z.string().optional(),
  wantMetalSeal: z.boolean().optional(),
  includeOtherItems: z.boolean().optional(),
  weight: z.string().optional(),
  itemCategory: z.string().optional(),
  specificItem: z.string().optional(),
  otherItemDescription: z.string().optional(),
  
  // Delivery options
  doorToDoor: z.boolean().optional(),
  additionalDeliveryAddresses: z.array(z.string()).optional(),
  
  // Payment options
  paymentOption: z.enum(["standard", "express"]).optional(),
  paymentMethod: z.enum(["card", "bank_transfer", "cash", "goods_arriving"]).optional(),
  
  // Terms
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormNewProps {
  onSubmitComplete: (data: any, shipmentId: string, amount: number) => void;
}

const BookingFormNew: React.FC<BookingFormNewProps> = ({ onSubmitComplete }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(3);
  const [activeTab, setActiveTab] = useState('drum');
  
  // Pickup details state
  const [pickupCountry, setPickupCountry] = useState('England');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupPostcode, setPickupPostcode] = useState('');
  const [postalCodeValid, setPostalCodeValid] = useState(true);
  const [postalCodeMessage, setPostalCodeMessage] = useState('');
  const [collectionRoute, setCollectionRoute] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [selectedCollectionDate, setSelectedCollectionDate] = useState('');
  
  // Shipment details state
  const [includeDrums, setIncludeDrums] = useState(true);
  const [includeOtherItems, setIncludeOtherItems] = useState(false);
  const [drumQuantity, setDrumQuantity] = useState('1');
  const [wantMetalSeal, setWantMetalSeal] = useState(false);
  const [doorToDoor, setDoorToDoor] = useState(false);
  const [additionalAddresses, setAdditionalAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [specificItem, setSpecificItem] = useState('');
  
  // Pricing state
  const [drumPrice, setDrumPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [metalSealPrice, setMetalSealPrice] = useState(0);
  const [doorToDoorPrice, setDoorToDoorPrice] = useState(0);
  
  // Initialize the form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pickupAddress: '',
      pickupCity: '',
      pickupPostcode: '',
      pickupCountry: 'England',
      recipientName: '',
      recipientPhone: '',
      additionalRecipientPhone: '',
      deliveryAddress: '',
      deliveryCity: '',
      shipmentType: 'drum',
      includeDrums: true,
      drumQuantity: '1',
      wantMetalSeal: false,
      includeOtherItems: false,
      weight: '',
      itemCategory: '',
      specificItem: '',
      otherItemDescription: '',
      doorToDoor: false,
      additionalDeliveryAddresses: [],
      paymentOption: 'standard',
      paymentMethod: 'card',
      agreeTerms: false,
    },
  });
  
  const { watch, setValue, handleSubmit, control, formState: { errors } } = form;
  
  // Watch form values for changes
  const watchShipmentType = watch('shipmentType');
  const watchDrumQuantity = watch('drumQuantity');
  const watchWantMetalSeal = watch('wantMetalSeal');
  const watchDoorToDoor = watch('doorToDoor');
  const watchIncludeDrums = watch('includeDrums');
  const watchIncludeOtherItems = watch('includeOtherItems');
  
  // Load user data if logged in
  useEffect(() => {
    const loadUserData = async () => {
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (data && !error) {
            setValue('firstName', data.first_name || '');
            setValue('lastName', data.last_name || '');
            setValue('email', data.email || session.user.email || '');
            setValue('phone', data.phone || '');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    
    loadUserData();
  }, [session, setValue]);
  
  // Update pricing when relevant form values change
  useEffect(() => {
    const calculatePricing = () => {
      // Base drum price
      const baseDrumPrice = 150;
      const quantity = parseInt(watchDrumQuantity || '1');
      const drumTotal = watchIncludeDrums ? baseDrumPrice * quantity : 0;
      
      // Metal seal price
      const sealPrice = watchWantMetalSeal ? 5 * quantity : 0;
      
      // Door to door price
      const addressCount = watchDoorToDoor ? 1 + additionalAddresses.length : 0;
      const dtdPrice = addressCount * 25;
      
      setDrumPrice(drumTotal);
      setMetalSealPrice(sealPrice);
      setDoorToDoorPrice(dtdPrice);
      setTotalPrice(drumTotal + sealPrice + dtdPrice);
    };
    
    calculatePricing();
  }, [watchIncludeDrums, watchDrumQuantity, watchWantMetalSeal, watchDoorToDoor, additionalAddresses]);
  
  // Handle postal code validation
  useEffect(() => {
    if (pickupPostcode && pickupCountry === 'England') {
      const cleanPostcode = pickupPostcode.trim().toUpperCase();
      
      // Check if it's a restricted postal code
      const isRestricted = restrictedPostalCodes.some(prefix => 
        cleanPostcode.startsWith(prefix)
      );
      
      if (isRestricted) {
        setPostalCodeValid(false);
        setPostalCodeMessage("We don't currently service this area. Please contact support.");
        return;
      }
      
      // Get the postal code prefix
      const prefix = cleanPostcode.match(/^[A-Z]+/);
      if (!prefix) {
        setPostalCodeValid(false);
        setPostalCodeMessage("Invalid postal code format");
        return;
      }
      
      // Check if we have a route for this postal code
      const route = postalCodeToRouteMap[prefix[0]];
      if (!route) {
        setPostalCodeValid(false);
        setPostalCodeMessage("We don't currently service this area. Please contact support.");
        return;
      }
      
      // Valid postal code with a route
      setPostalCodeValid(true);
      setPostalCodeMessage("");
      setCollectionRoute(route);
      
      // Get collection date for this route
      const date = getDateByRoute(route);
      setCollectionDate(date);
      setSelectedCollectionDate(date);
    }
  }, [pickupPostcode, pickupCountry]);
  
  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setValue(field as any, value);
  };
  
  // Handle drum quantity changes
  const handleDrumQuantityChange = (newQuantity: string) => {
    const quantity = parseInt(newQuantity);
    if (!isNaN(quantity) && quantity >= 1 && quantity <= 10) {
      setDrumQuantity(newQuantity);
      setValue('drumQuantity', newQuantity);
    }
  };
  
  // Handle increment/decrement drum quantity
  const incrementDrumQuantity = () => {
    const currentQuantity = parseInt(drumQuantity);
    if (currentQuantity < 10) {
      const newQuantity = (currentQuantity + 1).toString();
      setDrumQuantity(newQuantity);
      setValue('drumQuantity', newQuantity);
    }
  };
  
  const decrementDrumQuantity = () => {
    const currentQuantity = parseInt(drumQuantity);
    if (currentQuantity > 1) {
      const newQuantity = (currentQuantity - 1).toString();
      setDrumQuantity(newQuantity);
      setValue('drumQuantity', newQuantity);
    }
  };
  
  // Handle adding additional delivery addresses
  const addDeliveryAddress = () => {
    if (newAddress.trim() && !additionalAddresses.includes(newAddress.trim())) {
      const updatedAddresses = [...additionalAddresses, newAddress.trim()];
      setAdditionalAddresses(updatedAddresses);
      setValue('additionalDeliveryAddresses', updatedAddresses);
      setNewAddress('');
    }
  };
  
  // Handle removing additional delivery addresses
  const removeDeliveryAddress = (index: number) => {
    const updatedAddresses = additionalAddresses.filter((_, i) => i !== index);
    setAdditionalAddresses(updatedAddresses);
    setValue('additionalDeliveryAddresses', updatedAddresses);
  };
  
  // Handle form submission
  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Generate a unique shipment ID
      const shipmentId = `shp_${uuidv4()}`;
      
      // Create a tracking number
      const trackingNumber = `ZIM-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Get user ID if logged in
      let userId = null;
      if (session?.user) {
        userId = session.user.id;
      }
      
      // Create shipment record in database
      const { error } = await supabase
        .from('shipments')
        .insert({
          id: shipmentId.substring(4), // Remove 'shp_' prefix for UUID
          user_id: userId,
          status: 'pending_payment',
          tracking_number: trackingNumber,
          sender_details: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            address: `${data.pickupAddress}, ${data.pickupCountry === 'England' ? data.pickupPostcode : data.pickupCity}`,
          },
          recipient_details: {
            name: data.recipientName,
            phone: data.recipientPhone,
            additional_phone: data.additionalRecipientPhone || null,
            address: `${data.deliveryAddress}, ${data.deliveryCity}`,
          },
          shipment_type: data.includeDrums ? 'drum' : data.shipmentType,
          collection_date: selectedCollectionDate,
          collection_route: collectionRoute,
          metadata: {
            drum_quantity: data.includeDrums ? parseInt(data.drumQuantity || '1') : 0,
            metal_seal: data.wantMetalSeal || false,
            door_to_door: data.doorToDoor || false,
            additional_addresses: data.additionalDeliveryAddresses || [],
            other_items: data.includeOtherItems || false,
            item_category: data.itemCategory || null,
            specific_item: data.specificItem || null,
            item_description: data.otherItemDescription || null,
            weight: data.weight || null,
          }
        });
      
      if (error) {
        throw error;
      }
      
      // Call the onSubmitComplete callback with the form data and shipment ID
      onSubmitComplete(data, shipmentId, totalPrice);
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: error.message || 'There was a problem submitting your booking. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };
  
  // Handle next step
  const handleNextStep = async () => {
    if (currentStep < totalSteps) {
      // Validate current step fields
      let isValid = true;
      
      if (currentStep === 1) {
        // Validate sender and pickup details
        const fields = ['firstName', 'lastName', 'email', 'phone', 'pickupAddress'];
        
        if (pickupCountry === 'England') {
          fields.push('pickupPostcode');
          
          // Check if postal code is valid
          if (!postalCodeValid) {
            isValid = false;
            toast({
              title: 'Invalid Postal Code',
              description: postalCodeMessage || 'Please enter a valid postal code',
              variant: 'destructive',
            });
          }
        } else {
          fields.push('pickupCity');
        }
        
        // Check each field
        for (const field of fields) {
          const value = watch(field as any);
          if (!value) {
            isValid = false;
            toast({
              title: 'Missing Information',
              description: `Please fill in all required fields`,
              variant: 'destructive',
            });
            break;
          }
        }
      } else if (currentStep === 2) {
        // Validate recipient details
        const fields = ['recipientName', 'recipientPhone', 'deliveryAddress', 'deliveryCity'];
        
        // Check each field
        for (const field of fields) {
          const value = watch(field as any);
          if (!value) {
            isValid = false;
            toast({
              title: 'Missing Information',
              description: `Please fill in all required fields`,
              variant: 'destructive',
            });
            break;
          }
        }
        
        // Validate shipment details
        if (watchIncludeDrums && (!watchDrumQuantity || parseInt(watchDrumQuantity) < 1)) {
          isValid = false;
          toast({
            title: 'Invalid Drum Quantity',
            description: 'Please specify at least 1 drum',
            variant: 'destructive',
          });
        }
        
        if (watchIncludeOtherItems && (!itemCategory || !specificItem)) {
          isValid = false;
          toast({
            title: 'Missing Item Details',
            description: 'Please specify the item category and specific item',
            variant: 'destructive',
          });
        }
      }
      
      if (isValid) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };
  
  return (
    <div className="w-full">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div 
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStep ? 'bg-zim-green' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
              <div 
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                  index + 1 === currentStep
                    ? 'bg-zim-green text-white'
                    : index + 1 < currentStep
                    ? 'bg-zim-green/20 text-zim-green border border-zim-green'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {index + 1 < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <div className={currentStep === 1 ? 'text-zim-green font-medium' : ''}>Sender Details</div>
          <div className={currentStep === 2 ? 'text-zim-green font-medium' : ''}>Shipment Details</div>
          <div className={currentStep === 3 ? 'text-zim-green font-medium' : ''}>Review & Submit</div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Sender Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Sender Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={control}
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
                    control={control}
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
                  
                  <FormField
                    control={control}
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
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+44 123 456 7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
              
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Pickup Details</h2>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, Apt 4B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pickup Country */}
                    <div className="w-full">
                      <Label htmlFor="pickupCountry">Pickup Country</Label>
                      <Select
                        value={pickupCountry}
                        onValueChange={(value) => {
                          setPickupCountry(value);
                          // Clear city when country changes
                          if (value === 'Ireland') {
                            setPickupPostcode('');
                          } else {
                            setPickupCity('');
                          }
                          handleInputChange('pickupCountry', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="England">England</SelectItem>
                          <SelectItem value="Ireland">Ireland</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* For England: Show postcode field */}
                    {pickupCountry === 'England' && (
                      <div className="w-full sm:w-1/2">
                        <Label htmlFor="pickupPostcode">Postcode</Label>
                        <Input
                          id="pickupPostcode"
                          name="pickupPostcode"
                          placeholder="e.g. W1A 1AA"
                          onChange={(e) => {
                            setPickupPostcode(e.target.value);
                            handleInputChange('pickupPostcode', e.target.value);
                          }}
                          value={pickupPostcode}
                          required
                        />
                      </div>
                    )}

                    {/* For England: Show city input field */}
                    {pickupCountry === 'England' && (
                      <div className="w-full sm:w-1/2">
                        <Label htmlFor="pickupCity">City</Label>
                        <Input
                          id="pickupCity"
                          name="pickupCity"
                          placeholder="e.g. London"
                          onChange={(e) => {
                            setPickupCity(e.target.value);
                            handleInputChange('pickupCity', e.target.value);
                          }}
                          value={pickupCity}
                          required
                        />
                      </div>
                    )}

                    {/* For Ireland: Show city dropdown selector */}
                    {pickupCountry === 'Ireland' && (
                      <div className="w-full">
                        <IrelandCitySelector 
                          value={pickupCity}
                          onChange={(city) => {
                            setPickupCity(city);
                            handleInputChange('pickupCity', city);
                          }}
                          onCollectionDateChange={(date) => {
                            if (date) {
                              setCollectionDate(date);
                              setSelectedCollectionDate(date);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Collection information */}
                  {pickupPostcode && pickupCountry === 'England' && postalCodeValid && collectionRoute && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <h3 className="font-medium text-green-800 dark:text-green-300 mb-1">Collection Information</h3>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Your area is serviced by our <strong>{collectionRoute}</strong> collection route.
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Next collection date: <strong>{collectionDate}</strong>
                      </p>
                    </div>
                  )}
                  
                  {pickupPostcode && pickupCountry === 'England' && !postalCodeValid && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">Collection Information</h3>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {postalCodeMessage || "We don't currently service this area. Please contact support."}
                      </p>
                    </div>
                  )}
                  
                  {pickupCity && pickupCountry === 'Ireland' && collectionDate && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <h3 className="font-medium text-green-800 dark:text-green-300 mb-1">Collection Information</h3>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Your area is serviced by our <strong>{getRouteForIrelandCity(pickupCity)}</strong> collection route.
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Next collection date: <strong>{collectionDate}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </Card>
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next Step
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Shipment Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Recipient Details</h2>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="recipientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+263 123 456 789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="additionalRecipientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+263 987 654 321" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Input placeholder="456 Example St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="deliveryCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City in Zimbabwe</FormLabel>
                        <FormControl>
                          <Input placeholder="Harare" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
              
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Shipment Details</h2>
                
                <Tabs defaultValue="drum" value={activeTab} onValueChange={(value) => {
                  setActiveTab(value);
                  setValue('shipmentType', value as any);
                  
                  if (value === 'drum') {
                    setValue('includeDrums', true);
                    setIncludeDrums(true);
                  } else {
                    setValue('includeDrums', false);
                    setIncludeDrums(false);
                  }
                  
                  if (value === 'other') {
                    setValue('includeOtherItems', true);
                    setIncludeOtherItems(true);
                  }
                }}>
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="drum">Shipping Drums</TabsTrigger>
                    <TabsTrigger value="parcel">Parcels</TabsTrigger>
                    <TabsTrigger value="other">Other Items</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="drum" className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="includeDrums" 
                        checked={includeDrums}
                        onCheckedChange={(checked) => {
                          setIncludeDrums(!!checked);
                          setValue('includeDrums', !!checked);
                        }}
                      />
                      <label
                        htmlFor="includeDrums"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I want to ship items in drums
                      </label>
                    </div>
                    
                    {includeDrums && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="drumQuantity">Number of Drums</Label>
                          <div className="flex items-center mt-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={decrementDrumQuantity}
                              disabled={parseInt(drumQuantity) <= 1}
                              className="h-9 w-9 rounded-r-none"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              id="drumQuantity"
                              type="text"
                              value={drumQuantity}
                              onChange={(e) => handleDrumQuantityChange(e.target.value)}
                              className="h-9 rounded-none text-center w-16"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={incrementDrumQuantity}
                              disabled={parseInt(drumQuantity) >= 10}
                              className="h-9 w-9 rounded-l-none"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                              (Max 10 drums per booking)
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="wantMetalSeal" 
                            checked={wantMetalSeal}
                            onCheckedChange={(checked) => {
                              setWantMetalSeal(!!checked);
                              setValue('wantMetalSeal', !!checked);
                            }}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="wantMetalSeal"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                            >
                              Add metal security seals
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 ml-1 text-gray-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="w-[200px] text-xs">
                                      Metal seals provide extra security for your drums. £5 per drum.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </label>
                            <p className="text-sm text-muted-foreground">
                              £5 per drum (recommended for valuable items)
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="includeOtherItems" 
                            checked={includeOtherItems}
                            onCheckedChange={(checked) => {
                              setIncludeOtherItems(!!checked);
                              setValue('includeOtherItems', !!checked);
                            }}
                          />
                          <label
                            htmlFor="includeOtherItems"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I also want to ship other items (not in drums)
                          </label>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="parcel" className="space-y-4">
                    <div>
                      <Label htmlFor="weight">Parcel Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="e.g. 5"
                        min="0.1"
                        step="0.1"
                        onChange={(e) => setValue('weight', e.target.value)}
                        className="max-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the weight of your parcel in kilograms
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox 
                        id="includeOtherItems" 
                        checked={true}
                        disabled
                      />
                      <label
                        htmlFor="includeOtherItems"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Describe your items below
                      </label>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="other" className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 mb-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
                        <div>
                          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Custom Quote Required</h3>
                          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            For items that don't fit in standard drums or parcels, we'll need to provide a custom quote.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox 
                        id="includeOtherItems" 
                        checked={true}
                        disabled
                      />
                      <label
                        htmlFor="includeOtherItems"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Describe your items below
                      </label>
                    </div>
                  </TabsContent>
                </Tabs>
                
                {includeOtherItems && (
                  <div className="mt-6 space-y-4 border-t pt-4">
                    <h3 className="font-medium">Item Details</h3>
                    
                    <div>
                      <Label htmlFor="itemCategory">Item Category</Label>
                      <Select
                        value={itemCategory}
                        onValueChange={(value) => {
                          setItemCategory(value);
                          setValue('itemCategory', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="clothing">Clothing & Textiles</SelectItem>
                          <SelectItem value="furniture">Furniture</SelectItem>
                          <SelectItem value="appliances">Household Appliances</SelectItem>
                          <SelectItem value="auto_parts">Auto Parts</SelectItem>
                          <SelectItem value="medical">Medical Supplies</SelectItem>
                          <SelectItem value="food">Food Items</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="specificItem">Specific Item</Label>
                      <Input
                        id="specificItem"
                        placeholder="e.g. Laptop, Refrigerator, etc."
                        value={specificItem}
                        onChange={(e) => {
                          setSpecificItem(e.target.value);
                          setValue('specificItem', e.target.value);
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="otherItemDescription">Description (Optional)</Label>
                      <Textarea
                        id="otherItemDescription"
                        placeholder="Provide additional details about your item..."
                        onChange={(e) => setValue('otherItemDescription', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </Card>
              
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Delivery Options</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="doorToDoor" 
                      checked={doorToDoor}
                      onCheckedChange={(checked) => {
                        setDoorToDoor(!!checked);
                        setValue('doorToDoor', !!checked);
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="doorToDoor"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        Door-to-Door Delivery
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-[200px] text-xs">
                                We'll deliver directly to the recipient's address in Zimbabwe.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <p className="text-sm text-muted-foreground">
                        £25 per delivery address
                      </p>
                    </div>
                  </div>
                  
                  {doorToDoor && (
                    <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700 mt-4 space-y-4">
                      <div>
                        <Label htmlFor="additionalAddress">Additional Delivery Addresses (Optional)</Label>
                        <div className="flex mt-1.5">
                          <Input
                            id="additionalAddress"
                            placeholder="Enter additional address"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            className="rounded-r-none"
                          />
                          <Button
                            type="button"
                            onClick={addDeliveryAddress}
                            disabled={!newAddress.trim()}
                            className="rounded-l-none bg-zim-green hover:bg-zim-green/90"
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          £25 will be added for each additional address
                        </p>
                      </div>
                      
                      {additionalAddresses.length > 0 && (
                        <div className="space-y-2">
                          <Label>Additional Addresses</Label>
                          <div className="space-y-2">
                            {additionalAddresses.map((address, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                                <span className="text-sm truncate mr-2">{address}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDeliveryAddress(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
              
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevStep}
                >
                  Previous Step
                </Button>
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  Next Step
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Review Your Booking</h2>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sender">
                    <AccordionTrigger>Sender Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</h4>
                          <p>{watch('firstName')} {watch('lastName')}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h4>
                          <p>{watch('email')}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</h4>
                          <p>{watch('phone')}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pickup Address</h4>
                          <p>{watch('pickupAddress')}, {pickupCountry === 'England' ? watch('pickupPostcode') : watch('pickupCity')}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="recipient">
                    <AccordionTrigger>Recipient Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</h4>
                          <p>{watch('recipientName')}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</h4>
                          <p>{watch('recipientPhone')}</p>
                          {watch('additionalRecipientPhone') && (
                            <p className="text-sm text-gray-500">Additional: {watch('additionalRecipientPhone')}</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Address</h4>
                          <p>{watch('deliveryAddress')}, {watch('deliveryCity')}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="shipment">
                    <AccordionTrigger>Shipment Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {watchIncludeDrums && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Drums</h4>
                            <p>{watch('drumQuantity')} drum(s)</p>
                            {watchWantMetalSeal && <p className="text-sm">With metal security seals</p>}
                          </div>
                        )}
                        
                        {watchIncludeOtherItems && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Other Items</h4>
                            <p>{watch('specificItem')} ({watch('itemCategory')})</p>
                            {watch('otherItemDescription') && (
                              <p className="text-sm">{watch('otherItemDescription')}</p>
                            )}
                          </div>
                        )}
                        
                        {watchShipmentType === 'parcel' && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Parcel</h4>
                            <p>Weight: {watch('weight')} kg</p>
                          </div>
                        )}
                        
                        {watchDoorToDoor && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Door-to-Door Delivery</h4>
                            <p>Primary address: {watch('deliveryAddress')}, {watch('deliveryCity')}</p>
                            {additionalAddresses.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-sm font-medium">Additional Addresses:</h5>
                                <ul className="list-disc pl-5 text-sm">
                                  {additionalAddresses.map((address, index) => (
                                    <li key={index}>{address}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="collection">
                    <AccordionTrigger>Collection Information</AccordionTrigger>
                    <AccordionContent>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Collection Route</h4>
                        <p>{collectionRoute || getRouteForIrelandCity(pickupCity) || 'Not available'}</p>
                      </div>
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Collection Date</h4>
                        <p>{selectedCollectionDate || 'Not available'}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
              
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Price Summary</h2>
                
                <div className="space-y-2">
                  {watchIncludeDrums && (
                    <div className="flex justify-between">
                      <span>{watch('drumQuantity')} Drum(s)</span>
                      <span>£{drumPrice.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {watchWantMetalSeal && watchIncludeDrums && (
                    <div className="flex justify-between">
                      <span>Metal Security Seals ({watch('drumQuantity')} x £5)</span>
                      <span>£{metalSealPrice.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {watchDoorToDoor && (
                    <div className="flex justify-between">
                      <span>Door-to-Door Delivery ({1 + additionalAddresses.length} address{additionalAddresses.length > 0 ? 'es' : ''})</span>
                      <span>£{doorToDoorPrice.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>£{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="agreeTerms" 
                    checked={watch('agreeTerms')}
                    onCheckedChange={(checked) => {
                      setValue('agreeTerms', !!checked);
                    }}
                  />
                  <label
                    htmlFor="agreeTerms"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the <a href="/terms" target="_blank" className="text-zim-green hover:underline">Terms and Conditions</a> and <a href="/privacy" target="_blank" className="text-zim-green hover:underline">Privacy Policy</a>
                  </label>
                </div>
                {errors.agreeTerms && (
                  <p className="text-sm text-red-500 mt-2">{errors.agreeTerms.message}</p>
                )}
              </Card>
              
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevStep}
                >
                  Previous Step
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting || !watch('agreeTerms')}
                  className="bg-zim-green hover:bg-zim-green/90"
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
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

export default BookingFormNew;
