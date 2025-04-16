import React, { useState, useEffect } from 'react';
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
import { InfoIcon, Loader2, PackageCheck, Truck } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
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
  deliveryAddress: z.string().min(5, { message: 'Please enter a valid address' }),
  deliveryCity: z.string().min(2, { message: 'Please enter a valid city' }),
  
  shipmentType: z.enum(['parcel', 'drum', 'other', 'custom']),
  weight: z.string().optional(),
  drumQuantity: z.string().optional(),
  itemCategory: z.string().optional(),
  itemDescription: z.string().optional(),
  doorToDoor: z.boolean().default(false),
  
  paymentOption: z.enum(['standard', 'payLater', 'cashOnCollection', 'payOnArrival']),
  paymentMethod: z.enum(['card', 'paypal']).optional(),
  terms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  onSubmitComplete: (data: BookingFormValues, shipmentId: string, amount: number) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showPostcodeWarning, setShowPostcodeWarning] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [showCollectionInfo, setShowCollectionInfo] = useState(false);
  const [irelandCities, setIrelandCities] = useState<string[]>([]);
  
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
      deliveryAddress: '',
      deliveryCity: '',
      shipmentType: 'parcel',
      weight: '',
      drumQuantity: '1',
      itemCategory: '',
      itemDescription: '',
      doorToDoor: false,
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
  const watchWeight = form.watch('weight');
  const watchDrumQuantity = form.watch('drumQuantity');

  const renderShipmentTypeOptions = () => {
    return (
      <RadioGroup
        value={form.getValues('shipmentType')}
        onValueChange={(value) => form.setValue('shipmentType', value as any)}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2"
      >
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${form.getValues('shipmentType') === 'parcel' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => form.setValue('shipmentType', 'parcel')}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="parcel" id="parcel" />
            <FormLabel htmlFor="parcel" className="cursor-pointer font-medium">Parcel</FormLabel>
          </div>
          <p className="text-sm text-gray-500 mt-2">General shipments with weight-based pricing</p>
        </div>
        
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${form.getValues('shipmentType') === 'drum' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => form.setValue('shipmentType', 'drum')}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="drum" id="drum" />
            <FormLabel htmlFor="drum" className="cursor-pointer font-medium">Drum</FormLabel>
          </div>
          <p className="text-sm text-gray-500 mt-2">Standard size drums (200L) for goods</p>
        </div>
        
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${form.getValues('shipmentType') === 'other' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => form.setValue('shipmentType', 'other')}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="other" id="other" />
            <FormLabel htmlFor="other" className="cursor-pointer font-medium">Other Item</FormLabel>
          </div>
          <p className="text-sm text-gray-500 mt-2">Other standardized items with fixed pricing</p>
        </div>
        
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${form.getValues('shipmentType') === 'custom' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => form.setValue('shipmentType', 'custom')}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="custom" id="custom" />
            <FormLabel htmlFor="custom" className="cursor-pointer font-medium">Request Quote</FormLabel>
          </div>
          <p className="text-sm text-gray-500 mt-2">For non-standard items requiring custom quote</p>
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
    setShowPaymentMethods(watchPaymentOption === 'standard');
  }, [watchPaymentOption]);

  useEffect(() => {
    let calculatedPrice = 0;
    
    if (watchShipmentType === 'parcel') {
      const weight = parseFloat(watchWeight || '0');
      
      if (weight > 0 && weight <= 5) {
        calculatedPrice = 90;
      } else if (weight > 5 && weight <= 10) {
        calculatedPrice = 145;
      } else if (weight > 10 && weight <= 15) {
        calculatedPrice = 195;
      } else if (weight > 15 && weight <= 20) {
        calculatedPrice = 240;
      } else if (weight > 20) {
        calculatedPrice = 240 + (Math.ceil(weight - 20) * 12);
      }
    } else if (watchShipmentType === 'drum') {
      const quantity = parseInt(watchDrumQuantity || '1', 10);
      calculatedPrice = 145 * quantity;
    } else if (watchShipmentType === 'other') {
      calculatedPrice = 95; // Base price for other items
    }
    
    setPrice(calculatedPrice);
  }, [watchShipmentType, watchWeight, watchDrumQuantity]);

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    try {
      const trackingNumber = `ZIM${Date.now().toString().substring(6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      
      const shipmentId = generateUniqueId('shp_');
      
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
          amountPaid: price
        }
      });
      
      if (error) {
        console.error('Error creating shipment:', error);
        throw error;
      }
      
      onSubmitComplete(data, shipmentId, price);
    } catch (error) {
      console.error('Error submitting booking form:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recipient Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name *</FormLabel>
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
                  <FormLabel>Recipient Phone Number *</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>
        
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
          
          {watchShipmentType === 'parcel' && (
            <div className="mt-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcel Weight (kg) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.1" 
                        step="0.1" 
                        placeholder="Enter weight in kg" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="text-sm text-gray-500 mt-1">
                        <p>Pricing:</p>
                        <ul className="list-disc pl-5 text-xs space-y-1">
                          <li>Up to 5kg: £90</li>
                          <li>5-10kg: £145</li>
                          <li>10-15kg: £195</li>
                          <li>15-20kg: £240</li>
                          <li>Over 20kg: £240 + £12 per additional kg</li>
                        </ul>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {watchShipmentType === 'drum' && (
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
                        max="10" 
                        step="1" 
                        placeholder="Enter number of drums" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      <div className="text-sm text-gray-500 mt-1">
                        <p>Each drum costs £145</p>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {watchShipmentType === 'other' && (
            <div className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="itemCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="food">Food Items</SelectItem>
                        <SelectItem value="household">Household Goods</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
          
          <div className="mt-4">
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
                      Door-to-Door Delivery (add £25)
                    </FormLabel>
                    <FormDescription>
                      Add this option for direct delivery to the recipient's doorstep
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
          
          {watchShipmentType !== 'custom' && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Estimated Shipping Cost:</span>
                <span className="text-xl font-bold">£{price}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                <p>Additional mandatory costs:</p>
                <ul className="list-disc pl-5">
                  <li>Metal seal: £5</li>
                  {form.getValues('doorToDoor') && (
                    <li>Door-to-door delivery: £25</li>
                  )}
                </ul>
                <p className="font-medium mt-2">
                  Total: £{price + 5 + (form.getValues('doorToDoor') ? 25 : 0)}
                </p>
              </div>
            </div>
          )}
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Options</h3>
          
          <FormField
            control={form.control}
            name="paymentOption"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose Payment Option *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
                  >
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'standard' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <FormLabel htmlFor="standard" className="cursor-pointer font-medium">Pay Now</FormLabel>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Pay securely online to confirm your booking immediately</p>
                    </div>
                    
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'payLater' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="payLater" id="payLater" />
                        <FormLabel htmlFor="payLater" className="cursor-pointer font-medium">Pay Later</FormLabel>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Make a bank transfer within 48 hours to secure your booking</p>
                    </div>
                    
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'cashOnCollection' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                        <FormLabel htmlFor="cashOnCollection" className="cursor-pointer font-medium">Cash on Collection</FormLabel>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Pay in cash when we collect your item</p>
                    </div>
                    
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'payOnArrival' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="payOnArrival" id="payOnArrival" />
                        <FormLabel htmlFor="payOnArrival" className="cursor-pointer font-medium">Pay on Arrival</FormLabel>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Recipient pays for the shipment upon delivery in Zimbabwe</p>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {showPaymentMethods && (
            <div className="mt-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
                      >
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'card' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="card" id="card" />
                            <FormLabel htmlFor="card" className="cursor-pointer font-medium">Credit/Debit Card</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Pay securely with your card</p>
                        </div>
                        
                        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${field.value === 'paypal' ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="paypal" id="paypal" />
                            <FormLabel htmlFor="paypal" className="cursor-pointer font-medium">PayPal</FormLabel>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">Pay using your PayPal account</p>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </Card>
        
        <FormField
          control={form.control}
          name="terms"
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
                  I agree to the terms and conditions *
                </FormLabel>
                <FormDescription>
                  By checking this box, you agree to our shipping terms, privacy policy, and consent to the processing of your data.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-zim-green hover:bg-zim-green/90 px-6 py-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PackageCheck className="mr-2 h-4 w-4" />
                Complete Booking
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BookingForm;
