import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Truck,
  User,
  MapPin,
  CreditCard,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Info,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCountry } from '../ModernAdminDashboard';
import { getRouteForPostalCode, getIrelandRouteForCity, irelandCities } from '@/utils/postalCodeUtils';

interface FormData {
  // Sender Details
  senderFirstName: string;
  senderLastName: string;
  senderEmail: string;
  senderPhone: string;
  senderPhone2: string;
  pickupAddress: string;
  pickupCity: string;
  pickupPostcode: string;

  // Receiver Details
  receiverName: string;
  receiverPhone: string;
  receiverPhone2: string;
  deliveryAddress: string;
  deliveryCity: string;

  // Shipment Items
  drumQuantity: number;
  boxesDescription: string;
  wantMetalSeal: boolean;

  // Payment
  paymentMethod: 'standard' | 'cashOnCollection' | 'payOnArrival';

  // Admin notes
  adminNotes: string;
  bookingSource: string;
}

const getDrumPrice = (quantity: number): number => {
  if (quantity >= 5) return 260;
  if (quantity >= 2) return 270;
  return 280;
};

const ManualBookingTab: React.FC = () => {
  const { toast } = useToast();
  const { selectedCountry } = useAdminCountry();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectionRoute, setCollectionRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  const [formData, setFormData] = useState<FormData>({
    senderFirstName: '',
    senderLastName: '',
    senderEmail: '',
    senderPhone: '',
    senderPhone2: '',
    pickupAddress: '',
    pickupCity: '',
    pickupPostcode: '',
    receiverName: '',
    receiverPhone: '',
    receiverPhone2: '',
    deliveryAddress: '',
    deliveryCity: '',
    drumQuantity: 1,
    boxesDescription: '',
    wantMetalSeal: false,
    paymentMethod: 'standard',
    adminNotes: '',
    bookingSource: 'WhatsApp',
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fetch collection schedule based on postal code or city
  const fetchCollectionSchedule = async (postcodeOrCity: string) => {
    if (!postcodeOrCity || postcodeOrCity.length < 2) {
      setCollectionRoute(null);
      setCollectionDate(null);
      return;
    }

    const isIreland = selectedCountry === 'Ireland';

    setLoadingSchedule(true);
    try {
      const route = isIreland
        ? getIrelandRouteForCity(formData.pickupCity)
        : getRouteForPostalCode(postcodeOrCity);

      if (!route) {
        setCollectionRoute(null);
        setCollectionDate(null);
        setLoadingSchedule(false);
        return;
      }

      setCollectionRoute(route);

      // Fetch from database
      const routeWithSuffix = route.includes(' ROUTE') ? route : `${route} ROUTE`;
      const routeWithoutSuffix = route.replace(' ROUTE', '');

      let { data, error } = await supabase
        .from('collection_schedules')
        .select('pickup_date, route')
        .eq('route', routeWithoutSuffix)
        .single();

      if (error || !data) {
        const result = await supabase
          .from('collection_schedules')
          .select('pickup_date, route')
          .eq('route', routeWithSuffix)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        const result = await supabase
          .from('collection_schedules')
          .select('pickup_date, route')
          .ilike('route', `%${routeWithoutSuffix}%`)
          .limit(1)
          .single();
        data = result.data;
      }

      if (data) {
        const pickupDate = data.pickup_date;
        if (pickupDate && pickupDate !== 'Not set' && pickupDate !== 'To be confirmed' && pickupDate.trim() !== '') {
          setCollectionDate(pickupDate);
        } else {
          setCollectionDate('To be confirmed');
        }
      } else {
        setCollectionDate('To be confirmed');
      }
    } catch (error) {
      console.error('Error in fetchCollectionSchedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Effect to detect route when postal code or city changes
  useEffect(() => {
    if (selectedCountry === 'Ireland' && formData.pickupCity) {
      fetchCollectionSchedule(formData.pickupCity);
    } else if (formData.pickupPostcode) {
      fetchCollectionSchedule(formData.pickupPostcode);
    }
  }, [formData.pickupPostcode, formData.pickupCity, selectedCountry]);

  const calculateBaseTotal = () => {
    let total = 0;
    if (formData.drumQuantity > 0) {
      const drumPrice = getDrumPrice(formData.drumQuantity);
      total = formData.drumQuantity * drumPrice;

      if (formData.wantMetalSeal) {
        total += formData.drumQuantity * 5;
      }
    }
    return total;
  };

  const calculateFinalTotal = () => {
    const baseTotal = calculateBaseTotal();

    if (formData.paymentMethod === 'cashOnCollection') {
      return baseTotal - (formData.drumQuantity * 20);
    }
    if (formData.paymentMethod === 'payOnArrival') {
      return baseTotal * 1.20;
    }
    return baseTotal;
  };

  const resetForm = () => {
    setFormData({
      senderFirstName: '',
      senderLastName: '',
      senderEmail: '',
      senderPhone: '',
      senderPhone2: '',
      pickupAddress: '',
      pickupCity: '',
      pickupPostcode: '',
      receiverName: '',
      receiverPhone: '',
      receiverPhone2: '',
      deliveryAddress: '',
      deliveryCity: '',
      drumQuantity: 1,
      boxesDescription: '',
      wantMetalSeal: false,
      paymentMethod: 'standard',
      adminNotes: '',
      bookingSource: 'WhatsApp',
    });
    setCollectionRoute(null);
    setCollectionDate(null);
    setBookingSuccess(false);
    setTrackingNumber('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.senderFirstName || !formData.senderLastName || !formData.senderPhone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in sender name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.pickupAddress || !formData.pickupCity) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in pickup address and city.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.receiverName || !formData.receiverPhone || !formData.deliveryCity) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in receiver details.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.drumQuantity < 1 && !formData.boxesDescription) {
      toast({
        title: 'Missing Items',
        description: 'Please add at least drums or boxes to the shipment.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const timestamp = Date.now().toString();
      const newTrackingNumber = `ZSN${timestamp.slice(-8)}`;
      const receiptNumber = `RCP-${timestamp.slice(-10)}`;
      const finalAmount = calculateFinalTotal();

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
          country: selectedCountry
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
          drums: formData.drumQuantity > 0 ? {
            quantity: formData.drumQuantity,
            pricePerDrum: getDrumPrice(formData.drumQuantity),
            totalPrice: formData.drumQuantity * getDrumPrice(formData.drumQuantity)
          } : null,
          boxes: formData.boxesDescription ? {
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
        admin: {
          manualBooking: true,
          bookingSource: formData.bookingSource,
          notes: formData.adminNotes,
          createdBy: 'admin'
        }
      };

      // Create shipment
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          tracking_number: newTrackingNumber,
          user_id: null,
          origin: `${formData.pickupCity}, ${selectedCountry}`,
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
      await supabase
        .from('payments')
        .insert({
          shipment_id: shipmentData.id,
          user_id: null,
          amount: finalAmount,
          currency: 'GBP',
          payment_method: formData.paymentMethod,
          payment_status: 'pending',
          transaction_id: `TXN-${timestamp.slice(-8)}`
        });

      // Create receipt
      await supabase
        .from('receipts')
        .insert({
          shipment_id: shipmentData.id,
          receipt_number: receiptNumber,
          sender_details: shipmentMetadata.sender,
          recipient_details: shipmentMetadata.recipient,
          shipment_details: shipmentMetadata.items,
          payment_info: shipmentMetadata.pricing,
          collection_info: shipmentMetadata.collection,
          status: 'pending'
        });

      setTrackingNumber(newTrackingNumber);
      setBookingSuccess(true);

      toast({
        title: 'Booking Created',
        description: `Tracking number: ${newTrackingNumber}`,
      });

    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Booking Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Booking Created Successfully!</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Tracking Number</p>
              <p className="text-2xl font-mono font-bold text-gray-900">{trackingNumber}</p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Customer:</strong> {formData.senderFirstName} {formData.senderLastName}</p>
              <p><strong>Phone:</strong> {formData.senderPhone}</p>
              <p><strong>Route:</strong> {collectionRoute || 'Not assigned'}</p>
              <p><strong>Collection Date:</strong> {collectionDate || 'To be confirmed'}</p>
              <p><strong>Total:</strong> £{calculateFinalTotal().toFixed(2)}</p>
            </div>
            <Button onClick={resetForm} className="mt-4">
              Create Another Booking
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manual Booking</h2>
          <p className="text-gray-500">Create a booking for {selectedCountry} (WhatsApp/Phone orders)</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          selectedCountry === 'Ireland'
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {selectedCountry === 'Ireland' ? '🇮🇪' : '🇬🇧'} {selectedCountry}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Manual Booking Entry</h3>
            <p className="text-sm text-amber-800">
              Use this form to enter bookings received via WhatsApp, phone calls, or other channels.
              The booking source will be recorded for tracking purposes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Sender & Receiver */}
        <div className="space-y-6">
          {/* Sender Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Sender Details
              </CardTitle>
              <CardDescription>Customer pickup information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.senderFirstName}
                    onChange={(e) => updateField('senderFirstName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    value={formData.senderLastName}
                    onChange={(e) => updateField('senderLastName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.senderEmail}
                  onChange={(e) => updateField('senderEmail', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07123 456789"
                    value={formData.senderPhone}
                    onChange={(e) => updateField('senderPhone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone2">Second Phone</Label>
                  <Input
                    id="phone2"
                    type="tel"
                    placeholder="Optional"
                    value={formData.senderPhone2}
                    onChange={(e) => updateField('senderPhone2', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Pickup Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  value={formData.pickupAddress}
                  onChange={(e) => updateField('pickupAddress', e.target.value)}
                />
              </div>

              {/* City field - different for Ireland vs England */}
              {selectedCountry === 'Ireland' ? (
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    list="ireland-cities"
                    placeholder="Start typing city name..."
                    value={formData.pickupCity}
                    onChange={(e) => {
                      updateField('pickupCity', e.target.value);
                      updateField('pickupPostcode', 'N/A');
                    }}
                  />
                  <datalist id="ireland-cities">
                    {irelandCities.map((item) => (
                      <option key={item.city} value={item.city} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="London"
                      value={formData.pickupCity}
                      onChange={(e) => updateField('pickupCity', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postal Code *</Label>
                    <Input
                      id="postcode"
                      placeholder="SW1"
                      value={formData.pickupPostcode}
                      onChange={(e) => updateField('pickupPostcode', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Collection Info */}
              {collectionRoute && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">{collectionRoute}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 mt-1">
                    <CalendarClock className="h-4 w-4" />
                    <span>{loadingSchedule ? 'Loading...' : collectionDate || 'To be confirmed'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receiver Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" />
                Receiver Details
              </CardTitle>
              <CardDescription>Delivery to Zimbabwe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="receiverName">Full Name *</Label>
                <Input
                  id="receiverName"
                  placeholder="Jane Doe"
                  value={formData.receiverName}
                  onChange={(e) => updateField('receiverName', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receiverPhone">Phone *</Label>
                  <Input
                    id="receiverPhone"
                    type="tel"
                    placeholder="+263 123 456789"
                    value={formData.receiverPhone}
                    onChange={(e) => updateField('receiverPhone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="receiverPhone2">Second Phone</Label>
                  <Input
                    id="receiverPhone2"
                    type="tel"
                    placeholder="Optional"
                    value={formData.receiverPhone2}
                    onChange={(e) => updateField('receiverPhone2', e.target.value)}
                  />
                </div>
              </div>

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
                <Label htmlFor="deliveryCity">City *</Label>
                <Input
                  id="deliveryCity"
                  placeholder="Harare"
                  list="zim-cities"
                  value={formData.deliveryCity}
                  onChange={(e) => updateField('deliveryCity', e.target.value)}
                />
                <datalist id="zim-cities">
                  <option value="Harare" />
                  <option value="Bulawayo" />
                  <option value="Chitungwiza" />
                  <option value="Mutare" />
                  <option value="Gweru" />
                  <option value="Kwekwe" />
                  <option value="Kadoma" />
                  <option value="Masvingo" />
                  <option value="Chinhoyi" />
                  <option value="Marondera" />
                </datalist>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Items & Payment */}
        <div className="space-y-6">
          {/* Shipment Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-600" />
                Shipment Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="drumQty">Number of Drums</Label>
                <Input
                  id="drumQty"
                  type="number"
                  min="0"
                  max="20"
                  value={formData.drumQuantity}
                  onChange={(e) => updateField('drumQuantity', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Price: £{getDrumPrice(formData.drumQuantity)} per drum
                  {formData.drumQuantity >= 5 && ' (bulk discount)'}
                </p>
              </div>

              <div>
                <Label htmlFor="boxes">Boxes & Other Items</Label>
                <Textarea
                  id="boxes"
                  placeholder="Describe any boxes or other items..."
                  value={formData.boxesDescription}
                  onChange={(e) => updateField('boxesDescription', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="metalSeal"
                  checked={formData.wantMetalSeal}
                  onChange={(e) => updateField('wantMetalSeal', e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="metalSeal" className="text-sm">
                  Metal Coded Seal (+£5 per drum)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={formData.paymentMethod}
                onValueChange={(value) => updateField('paymentMethod', value)}
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label htmlFor="standard" className="flex-1 cursor-pointer">
                    <div className="font-medium">Standard Payment</div>
                    <div className="text-sm text-gray-500">Full payment via bank transfer</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                  <RadioGroupItem value="cashOnCollection" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer">
                    <div className="font-medium">Cash on Collection</div>
                    <div className="text-sm text-green-600">£20 discount per drum</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                  <RadioGroupItem value="payOnArrival" id="arrival" />
                  <Label htmlFor="arrival" className="flex-1 cursor-pointer">
                    <div className="font-medium">Pay on Arrival</div>
                    <div className="text-sm text-orange-600">+20% premium</div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Price Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Drums ({formData.drumQuantity} x £{getDrumPrice(formData.drumQuantity)})</span>
                  <span>£{(formData.drumQuantity * getDrumPrice(formData.drumQuantity)).toFixed(2)}</span>
                </div>
                {formData.wantMetalSeal && formData.drumQuantity > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Metal Seal ({formData.drumQuantity} x £5)</span>
                    <span>£{(formData.drumQuantity * 5).toFixed(2)}</span>
                  </div>
                )}
                {formData.paymentMethod === 'cashOnCollection' && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Cash Discount</span>
                    <span>-£{(formData.drumQuantity * 20).toFixed(2)}</span>
                  </div>
                )}
                {formData.paymentMethod === 'payOnArrival' && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Pay on Arrival Premium (20%)</span>
                    <span>+£{(calculateBaseTotal() * 0.20).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>£{calculateFinalTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-600" />
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="source">Booking Source</Label>
                <Select
                  value={formData.bookingSource}
                  onValueChange={(value) => updateField('bookingSource', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="In Person">In Person</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or notes..."
                  value={formData.adminNotes}
                  onChange={(e) => updateField('adminNotes', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Create Booking
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualBookingTab;
