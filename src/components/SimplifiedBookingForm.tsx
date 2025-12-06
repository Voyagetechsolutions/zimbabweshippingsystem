import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronRight, ChevronLeft, Package, Truck, User, MapPin, CreditCard, Wallet, CalendarClock, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BookingReceipt from '@/components/BookingReceipt';
import { getRouteForPostalCode, getIrelandRouteForCity } from '@/utils/postalCodeUtils';

interface FormData {
  // Sender Details
  senderFirstName: string;
  senderLastName: string;
  senderEmail: string;
  senderPhone: string;
  senderPhone2?: string;
  pickupAddress: string;
  pickupCity: string;
  pickupPostcode: string;
  pickupCountry: string;
  
  // Receiver Details
  receiverName: string;
  receiverPhone: string;
  receiverPhone2?: string;
  deliveryAddress: string;
  deliveryCity: string;
  
  // Shipment Items
  includeDrums: boolean;
  drumQuantity: number;
  includeBoxes: boolean;
  boxesDescription: string;
  
  // Add-ons
  wantMetalSeal: boolean;
  
  // Payment (moved to step 5)
  paymentMethod: 'standard' | 'cashOnCollection' | 'payOnArrival';
}

const getDrumPrice = (quantity: number): number => {
  if (quantity >= 5) return 260;
  if (quantity >= 2) return 270;
  return 280;
};

export const SimplifiedBookingForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSecondPhone, setShowSecondPhone] = useState(false);
  const [showReceiverSecondPhone, setShowReceiverSecondPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [collectionRoute, setCollectionRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    senderFirstName: '',
    senderLastName: '',
    senderEmail: '',
    senderPhone: '',
    senderPhone2: '',
    pickupAddress: '',
    pickupCity: '',
    pickupPostcode: '',
    pickupCountry: 'England',
    receiverName: '',
    receiverPhone: '',
    receiverPhone2: '',
    deliveryAddress: '',
    deliveryCity: '',
    includeDrums: false,
    drumQuantity: 0,
    includeBoxes: false,
    boxesDescription: '',
    wantMetalSeal: false,
    paymentMethod: 'standard',
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fetch collection schedule based on postal code
  const fetchCollectionSchedule = async (postcode: string) => {
    if (!postcode || postcode.length < 2) {
      setCollectionRoute(null);
      setCollectionDate(null);
      return;
    }

    setLoadingSchedule(true);
    try {
      // Detect route from postal code
      const route = formData.pickupCountry === 'Ireland'
        ? getIrelandRouteForCity(formData.pickupCity)
        : getRouteForPostalCode(postcode);

      if (!route) {
        setCollectionRoute(null);
        setCollectionDate(null);
        setLoadingSchedule(false);
        return;
      }

      setCollectionRoute(route);

      // Strip " ROUTE" suffix to match database format
      // Database stores "LONDON" but utils return "LONDON ROUTE"
      const dbRouteName = route.replace(' ROUTE', '');

      // Fetch collection date from database
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('pickup_date')
        .eq('route', dbRouteName)
        .single();

      if (error) {
        console.error('Error fetching collection schedule:', error);
        setCollectionDate(null);
      } else if (data) {
        setCollectionDate(data.pickup_date);
      }
    } catch (error) {
      console.error('Error in fetchCollectionSchedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Effect to detect route when postal code changes
  useEffect(() => {
    if (formData.pickupPostcode) {
      fetchCollectionSchedule(formData.pickupPostcode);
    }
  }, [formData.pickupPostcode, formData.pickupCountry, formData.pickupCity]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.senderFirstName || !formData.senderLastName || !formData.senderEmail || 
            !formData.senderPhone || !formData.pickupAddress || !formData.pickupCity || !formData.pickupPostcode) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all required fields.',
            variant: 'destructive',
          });
          return false;
        }
        // Basic email validation
        if (!/\S+@\S+\.\S+/.test(formData.senderEmail)) {
          toast({
            title: 'Invalid Email',
            description: 'Please enter a valid email address.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      
      case 2:
        if (!formData.receiverName || !formData.receiverPhone || !formData.deliveryAddress || !formData.deliveryCity) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all required receiver details.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      
      case 3:
        if (!formData.includeDrums && !formData.includeBoxes) {
          toast({
            title: 'Select Items',
            description: 'Please select at least one type of shipment.',
            variant: 'destructive',
          });
          return false;
        }
        if (formData.includeDrums && formData.drumQuantity < 1) {
          toast({
            title: 'Drum Quantity',
            description: 'Please enter how many drums you want to ship.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const calculateBaseTotal = () => {
    let total = 0;
    if (formData.includeDrums && formData.drumQuantity > 0) {
      const drumPrice = getDrumPrice(formData.drumQuantity);
      total = formData.drumQuantity * drumPrice;
      
      // Add metal seal cost
      if (formData.wantMetalSeal) {
        total += formData.drumQuantity * 5;
      }
    }
    return total;
  };

  const calculateFinalTotal = () => {
    const baseTotal = calculateBaseTotal();
    
    // Apply payment method adjustments
    if (formData.paymentMethod === 'cashOnCollection' && formData.includeDrums) {
      return baseTotal - (formData.drumQuantity * 20); // £20 discount per drum
    }
    if (formData.paymentMethod === 'payOnArrival') {
      return baseTotal * 1.20; // 20% premium
    }
    return baseTotal;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Generate tracking number and receipt number
      const timestamp = Date.now().toString();
      const trackingNumber = `ZSN${timestamp.slice(-8)}`;
      const receiptNumber = `RCP-${timestamp.slice(-10)}`;
      
      const finalAmount = calculateFinalTotal();
      
      // Build notes with add-ons and custom items
      let notes = [];
      if (formData.wantMetalSeal) notes.push('Metal Coded Seal requested');
      if (formData.paymentMethod === 'cashOnCollection') notes.push('Cash payment (discount applied)');
      if (formData.includeBoxes) notes.push(`Boxes & Other Items: ${formData.boxesDescription}`);
      
      // Prepare metadata for shipment
      const shipmentMetadata = {
        sender: {
          firstName: formData.senderFirstName,
          lastName: formData.senderLastName,
          email: formData.senderEmail,
          phone: formData.senderPhone,
          phone2: formData.senderPhone2,
          address: formData.pickupAddress,
          city: formData.pickupCity,
          postcode: formData.pickupPostcode,
          country: formData.pickupCountry
        },
        recipient: {
          name: formData.receiverName,
          phone: formData.receiverPhone,
          phone2: formData.receiverPhone2,
          address: formData.deliveryAddress,
          city: formData.deliveryCity,
          country: 'Zimbabwe'
        },
        items: {
          drums: formData.includeDrums ? {
            quantity: formData.drumQuantity,
            pricePerDrum: getDrumPrice(formData.drumQuantity),
            totalPrice: formData.drumQuantity * getDrumPrice(formData.drumQuantity)
          } : null,
          boxes: formData.includeBoxes ? {
            description: formData.boxesDescription
          } : null,
          addOns: {
            metalSeal: formData.wantMetalSeal
          }
        },
        pricing: {
          baseAmount: calculateBaseTotal(),
          finalAmount: finalAmount,
          paymentMethod: formData.paymentMethod
        },
        collection: {
          route: collectionRoute,
          date: collectionDate
        },
        notes: notes.length > 0 ? notes.join(' | ') : null
      };
      
      // Create shipment with proper schema
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          tracking_number: trackingNumber,
          user_id: null, // Guest booking
          origin: `${formData.pickupCity}, ${formData.pickupCountry}`,
          destination: `${formData.deliveryCity}, Zimbabwe`,
          status: 'pending',
          metadata: shipmentMetadata,
          can_modify: true,
          can_cancel: true
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: null,
          shipment_id: shipmentData.id,
          amount: finalAmount,
          currency: 'GBP',
          payment_method: formData.paymentMethod,
          payment_status: 'pending',
          transaction_id: `TX-${timestamp.slice(-12)}`
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: null,
          shipment_id: shipmentData.id,
          payment_id: paymentData.id,
          receipt_number: receiptNumber,
          amount: finalAmount,
          currency: 'GBP',
          payment_method: formData.paymentMethod,
          status: 'pending',
          sender_details: shipmentMetadata.sender,
          recipient_details: shipmentMetadata.recipient,
          shipment_details: shipmentMetadata.items,
          payment_info: {
            paymentMethod: formData.paymentMethod,
            baseAmount: calculateBaseTotal(),
            finalAmount: finalAmount,
            transactionId: paymentData.transaction_id
          },
          collection_info: {
            pickupAddress: `${formData.pickupAddress}, ${formData.pickupCity}, ${formData.pickupPostcode}`,
            deliveryAddress: `${formData.deliveryAddress}, ${formData.deliveryCity}, Zimbabwe`,
            route: collectionRoute,
            collectionDate: collectionDate
          }
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create or update customer profile
      try {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', formData.senderEmail)
          .maybeSingle();

        if (!existingProfile && !checkError) {
          // Create new customer profile for guest booking
          await supabase
            .from('profiles')
            .insert({
              id: shipmentData.id, // Use shipment ID as temporary profile ID
              email: formData.senderEmail,
              full_name: `${formData.senderFirstName} ${formData.senderLastName}`,
              role: 'customer',
              is_admin: false
            });
        }
      } catch (profileError) {
        console.error('Error creating customer profile:', profileError);
        // Don't throw - this is not critical
      }

      toast({
        title: 'Booking Submitted Successfully! 🎉',
        description: `Receipt #${receiptNumber} | Tracking: ${trackingNumber}`,
      });

      // Store receipt data for display
      setReceiptData({
        receiptNumber,
        trackingNumber,
        amount: finalAmount,
        collectionRoute,
        collectionDate,
        ...formData
      });
      setBookingComplete(true);
      
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({
        title: 'Booking Failed',
        description: 'Something went wrong. Please try again or call us for help.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Step {currentStep} of 5</span>
        <span className="text-sm text-gray-500">{Math.round((currentStep / 5) * 100)}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-zim-green h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-zim-green" />
          Your Details
        </CardTitle>
        <CardDescription>Where should we collect from?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.senderFirstName}
              onChange={(e) => updateField('senderFirstName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Smith"
              value={formData.senderLastName}
              onChange={(e) => updateField('senderLastName', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.senderEmail}
            onChange={(e) => updateField('senderEmail', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="07123 456789"
            value={formData.senderPhone}
            onChange={(e) => updateField('senderPhone', e.target.value)}
          />
        </div>

        {!showSecondPhone && (
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto"
            onClick={() => setShowSecondPhone(true)}
          >
            + Add another phone number
          </Button>
        )}

        {showSecondPhone && (
          <div>
            <Label htmlFor="phone2">Second Phone Number (Optional)</Label>
            <Input
              id="phone2"
              type="tel"
              placeholder="07987 654321"
              value={formData.senderPhone2}
              onChange={(e) => updateField('senderPhone2', e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="address">Pickup Address</Label>
          <Input
            id="address"
            placeholder="123 Main Street"
            value={formData.pickupAddress}
            onChange={(e) => updateField('pickupAddress', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="London"
              value={formData.pickupCity}
              onChange={(e) => updateField('pickupCity', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="postcode">Postal Code</Label>
            <Input
              id="postcode"
              placeholder="e.g., SW1, B1"
              value={formData.pickupPostcode}
              onChange={(e) => updateField('pickupPostcode', e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Just the area code is fine</p>
          </div>
        </div>

        {/* Collection Schedule Info */}
        {collectionRoute && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Collection Information</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-800 dark:text-blue-400">
                      <strong>Route:</strong> {collectionRoute}
                    </span>
                  </div>
                  {collectionDate && (
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-800 dark:text-blue-400">
                        <strong>Next Collection:</strong> {collectionDate}
                      </span>
                    </div>
                  )}
                  {loadingSchedule && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic">Loading collection schedule...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-zim-red" />
          Receiver Details
        </CardTitle>
        <CardDescription>Who will receive the shipment in Zimbabwe?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="receiverName">Full Name</Label>
          <Input
            id="receiverName"
            placeholder="Jane Doe"
            value={formData.receiverName}
            onChange={(e) => updateField('receiverName', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="receiverPhone">Phone Number</Label>
          <Input
            id="receiverPhone"
            type="tel"
            placeholder="+263 123 456789"
            value={formData.receiverPhone}
            onChange={(e) => updateField('receiverPhone', e.target.value)}
          />
        </div>

        {!showReceiverSecondPhone && (
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto"
            onClick={() => setShowReceiverSecondPhone(true)}
          >
            + Add another phone number
          </Button>
        )}

        {showReceiverSecondPhone && (
          <div>
            <Label htmlFor="receiverPhone2">Second Phone Number (Optional)</Label>
            <Input
              id="receiverPhone2"
              type="tel"
              placeholder="+263 987 654321"
              value={formData.receiverPhone2}
              onChange={(e) => updateField('receiverPhone2', e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="deliveryAddress">Delivery Address</Label>
          <Input
            id="deliveryAddress"
            placeholder="456 High Street"
            value={formData.deliveryAddress}
            onChange={(e) => updateField('deliveryAddress', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="deliveryCity">City</Label>
          <Input
            id="deliveryCity"
            placeholder="Harare, Bulawayo, etc."
            value={formData.deliveryCity}
            onChange={(e) => updateField('deliveryCity', e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            We deliver to main towns and major cities only
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => {
    const drumPrice = formData.drumQuantity > 0 ? getDrumPrice(formData.drumQuantity) : 280;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-zim-yellow" />
            What are you shipping?
          </CardTitle>
          <CardDescription>Select all that apply</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drums Option */}
          <div className={`border-2 rounded-lg p-5 transition-all ${formData.includeDrums ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-600' : 'border-gray-200 hover:border-zim-green dark:border-gray-700 dark:hover:border-green-600'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeDrums}
                onChange={(e) => updateField('includeDrums', e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Drums (200-220 L)</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                  <div>• 5+ drums: £260 each</div>
                  <div>• 2-4 drums: £270 each</div>
                  <div>• 1 drum: £280</div>
                </div>
                
                {formData.includeDrums && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="drumQty" className="text-base">How many drums?</Label>
                      <Input
                        id="drumQty"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.drumQuantity || ''}
                        onChange={(e) => updateField('drumQuantity', parseInt(e.target.value) || 0)}
                        className="max-w-xs mt-2"
                      />
                      {formData.drumQuantity > 0 && (
                        <p className="text-sm text-zim-green font-medium mt-2">
                          £{drumPrice} per drum
                        </p>
                      )}
                    </div>

                    {/* Add-on Services */}
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Add-on Services</h4>
                      
                      {/* Metal Seal */}
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.wantMetalSeal}
                          onChange={(e) => updateField('wantMetalSeal', e.target.checked)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Metal Coded Seal</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Secure coded seals for drums</div>
                          <div className="text-sm font-semibold text-zim-green mt-1">+£5/drum</div>
                        </div>
                      </label>

                      {/* Included Services */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">✓ Included Services</div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div>• Full insurance coverage</div>
                          <div>• Real-time tracking & updates</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Boxes & Other Items - Custom Quote */}
          <div className={`border-2 rounded-lg p-5 transition-all ${formData.includeBoxes ? 'border-zim-yellow bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600' : 'border-gray-200 hover:border-zim-yellow dark:border-gray-700 dark:hover:border-yellow-600'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeBoxes}
                onChange={(e) => updateField('includeBoxes', e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Boxes & Other Items</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">We'll give you a custom quote</div>
                
                {formData.includeBoxes && (
                  <div className="mt-4">
                    <Label htmlFor="boxesDesc" className="text-base">What are you sending?</Label>
                    <textarea
                      id="boxesDesc"
                      placeholder="e.g., 3 boxes of clothes, 1 suitcase, books"
                      value={formData.boxesDescription}
                      onChange={(e) => updateField('boxesDescription', e.target.value)}
                      className="w-full mt-2 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:ring-2 focus:ring-zim-yellow focus:border-transparent min-h-[100px]"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Describe what you're shipping and we'll get back to you with a custom price
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Multiple Drop-off Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Multiple drop-off addresses?</strong> No problem! Just tell the driver during collection.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-zim-green" />
          Booking Summary
        </CardTitle>
        <CardDescription>Please review your booking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sender */}
        <div>
          <h3 className="font-medium mb-2">Collection Details</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-1">
            <p><strong>{formData.senderFirstName} {formData.senderLastName}</strong></p>
            <p>{formData.senderEmail}</p>
            <p>{formData.senderPhone}</p>
            <p className="text-gray-600 dark:text-gray-400">{formData.pickupAddress}, {formData.pickupCity}, {formData.pickupPostcode}</p>
          </div>
        </div>

        {/* Receiver */}
        <div>
          <h3 className="font-medium mb-2">Delivery Details</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-1">
            <p><strong>{formData.receiverName}</strong></p>
            <p>{formData.receiverPhone}</p>
            <p className="text-gray-600 dark:text-gray-400">{formData.deliveryAddress}, {formData.deliveryCity}, Zimbabwe</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <h3 className="font-medium mb-2">Shipment Items</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-3">
            {formData.includeDrums && formData.drumQuantity > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{formData.drumQuantity} x Drum (200-220 L)</span>
                  <span className="font-medium">£{formData.drumQuantity * getDrumPrice(formData.drumQuantity)}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  @ £{getDrumPrice(formData.drumQuantity)} per drum
                </div>
                
                {/* Add-ons */}
                {formData.wantMetalSeal && (
                  <div className="flex justify-between text-gray-700 dark:text-gray-300 border-t pt-2">
                    <span>Metal Coded Seal ({formData.drumQuantity} x £5)</span>
                    <span>+£{formData.drumQuantity * 5}</span>
                  </div>
                )}
                {/* Included Services */}
                <div className="border-t pt-2 text-xs text-gray-500 dark:text-gray-400">
                  ✓ Insurance & Tracking included
                </div>
              </div>
            )}
            
            {formData.includeBoxes && (
              <div className={formData.includeDrums ? 'border-t pt-3' : ''}>
                <p className="font-medium text-gray-700 dark:text-gray-300">Boxes & Other Items:</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{formData.boxesDescription}</p>
                <p className="text-xs italic mt-2 text-blue-600 dark:text-blue-400">Custom quote will be provided</p>
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        {formData.includeDrums && formData.drumQuantity > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-zim-green">£{calculateBaseTotal()}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.includeBoxes && '* Drums total only. Custom quote for other items will be sent separately.'}
              {!formData.includeBoxes && 'Final amount for drums'}
            </p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-900 dark:text-yellow-300">
            <strong>Next steps:</strong> We'll contact you within 24 hours to confirm collection time and payment details.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => {
    const baseTotal = calculateBaseTotal();
    const cashDiscount = formData.includeDrums ? formData.drumQuantity * 20 : 0;
    const cashTotal = baseTotal - cashDiscount;
    const premiumTotal = baseTotal * 1.20;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-zim-green" />
            Payment Method
          </CardTitle>
          <CardDescription>Choose how you'd like to pay</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={formData.paymentMethod} 
            onValueChange={(value) => updateField('paymentMethod', value as 'standard' | 'cashOnCollection' | 'payOnArrival')}
            className="space-y-4"
          >
            {/* Standard Payment */}
            <div className={`border-2 rounded-lg p-4 transition-all ${formData.paymentMethod === 'standard' ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-600' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
              <label htmlFor="standard" className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value="standard" id="standard" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Standard Payment
                    </span>
                    <span className="text-xl font-bold text-zim-green">£{baseTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pay by card or within 30 days</p>
                </div>
              </label>
            </div>

            {/* Cash on Collection - With Discount */}
            <div className={`border-2 rounded-lg p-4 transition-all ${formData.paymentMethod === 'cashOnCollection' ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-600' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
              <label htmlFor="cashOnCollection" className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value="cashOnCollection" id="cashOnCollection" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-lg flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Pay Cash on Collection
                    </span>
                    <div className="text-right">
                      {formData.includeDrums && cashDiscount > 0 ? (
                        <>
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through mr-2">£{baseTotal.toFixed(2)}</span>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">£{cashTotal.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-xl font-bold text-zim-green">£{baseTotal.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pay with cash when your items are collected</p>
                  
                  {formData.includeDrums && cashDiscount > 0 && (
                    <div className="flex items-start rounded-md bg-green-100 dark:bg-green-900/30 p-3 text-sm mt-2">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-green-800 dark:text-green-300">Save £{cashDiscount}!</span>
                        <p className="text-green-700 dark:text-green-400">Get £20 discount per drum when you pay cash</p>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Pay on Arrival */}
            <div className={`border-2 rounded-lg p-4 transition-all ${formData.paymentMethod === 'payOnArrival' ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-600' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
              <label htmlFor="payOnArrival" className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value="payOnArrival" id="payOnArrival" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-lg flex items-center gap-2">
                      <CalendarClock className="h-5 w-5" />
                      Pay on Arrival
                    </span>
                    <div className="text-right">
                      <span className="text-sm text-gray-500 dark:text-gray-400 line-through mr-2">£{baseTotal.toFixed(2)}</span>
                      <span className="text-xl font-bold text-orange-600 dark:text-orange-400">£{premiumTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pay when your shipment reaches Zimbabwe</p>
                  
                  <div className="flex items-start rounded-md bg-orange-100 dark:bg-orange-900/30 p-3 text-sm mt-2">
                    <AlertCircle className="mr-2 h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <span className="text-orange-700 dark:text-orange-400">This option adds a 20% premium (+£{(premiumTotal - baseTotal).toFixed(2)}) to the total cost.</span>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* Payment Summary */}
          <div className="mt-6 pt-6 border-t">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Base Amount:</span>
                <span>£{baseTotal.toFixed(2)}</span>
              </div>
              
              {formData.paymentMethod === 'cashOnCollection' && cashDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                  <span>Cash Discount:</span>
                  <span>-£{cashDiscount.toFixed(2)}</span>
                </div>
              )}
              
              {formData.paymentMethod === 'payOnArrival' && (
                <div className="flex justify-between text-orange-600 dark:text-orange-400 font-medium">
                  <span>Payment Premium (20%):</span>
                  <span>+£{(premiumTotal - baseTotal).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total to Pay:</span>
                <span className="text-zim-green">£{calculateFinalTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Show receipt after successful booking
  if (bookingComplete && receiptData) {
    return (
      <BookingReceipt
        receiptNumber={receiptData.receiptNumber}
        trackingNumber={receiptData.trackingNumber}
        amount={receiptData.amount}
        senderFirstName={receiptData.senderFirstName}
        senderLastName={receiptData.senderLastName}
        senderEmail={receiptData.senderEmail}
        senderPhone={receiptData.senderPhone}
        pickupAddress={receiptData.pickupAddress}
        pickupCity={receiptData.pickupCity}
        pickupPostcode={receiptData.pickupPostcode}
        receiverName={receiptData.receiverName}
        receiverPhone={receiptData.receiverPhone}
        deliveryAddress={receiptData.deliveryAddress}
        deliveryCity={receiptData.deliveryCity}
        drumQuantity={receiptData.drumQuantity}
        includeBoxes={receiptData.includeBoxes}
        boxesDescription={receiptData.boxesDescription}
        wantMetalSeal={receiptData.wantMetalSeal}
        paymentMethod={receiptData.paymentMethod}
        collectionRoute={receiptData.collectionRoute}
        collectionDate={receiptData.collectionDate}
        onNewBooking={() => {
          setBookingComplete(false);
          setReceiptData(null);
          setCurrentStep(1);
          setFormData({
            senderFirstName: '',
            senderLastName: '',
            senderEmail: '',
            senderPhone: '',
            senderPhone2: '',
            pickupAddress: '',
            pickupCity: '',
            pickupPostcode: '',
            pickupCountry: 'England',
            receiverName: '',
            receiverPhone: '',
            receiverPhone2: '',
            deliveryAddress: '',
            deliveryCity: '',
            includeDrums: false,
            drumQuantity: 0,
            includeBoxes: false,
            boxesDescription: '',
            wantMetalSeal: false,
            paymentMethod: 'standard',
          });
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {renderProgressBar()}

      <div className="mb-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {currentStep < 5 ? (
          <Button
            type="button"
            onClick={nextStep}
            className="ml-auto flex items-center gap-2 bg-zim-green hover:bg-zim-green/90"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="ml-auto bg-zim-green hover:bg-zim-green/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Booking'}
          </Button>
        )}
      </div>
    </div>
  );
};
