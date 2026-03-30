import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronRight, ChevronLeft, Package, Truck, User, MapPin, CreditCard, Wallet, CalendarClock, CheckCircle2, AlertCircle, Info, Plus, Trash2, Calendar } from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BookingReceipt from '@/components/BookingReceipt';
import { getRouteForPostalCode, getIrelandRouteForCity, irelandCities, initializeRouteCache } from '@/utils/postalCodeUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  // Trunks/Storage Boxes (Ireland only)
  includeTrunks: boolean;
  trunkQuantity: number;

  // Add-ons
  wantMetalSeal: boolean;

  // Purchase Drums (England only)
  purchaseDrums: boolean;
  purchaseDrumType: 'metal' | 'plastic' | null;
  purchaseDrumQuantity: number;

  // Payment (moved to step 5)
  paymentMethod: 'standard' | 'cashOnCollection' | 'payOnArrival';

  // Payment Schedule (for standard payment)
  usePaymentSchedule: boolean;
  paymentSchedule: PaymentInstallment[];
}

interface PaymentInstallment {
  id: string;
  amount: number;
  date: string; // ISO date string
  paid: boolean;
}

// UK drum prices (GBP)
const getDrumPrice = (quantity: number): number => {
  if (quantity >= 5) return 260;
  if (quantity >= 2) return 270;
  return 280;
};

// Ireland drum prices (EUR)
const getIrelandDrumPrice = (quantity: number): number => {
  if (quantity >= 5) return 340;
  if (quantity >= 2) return 350;
  return 360;
};

// Ireland trunk/storage box prices (EUR)
const getTrunkPrice = (quantity: number): number => {
  if (quantity >= 5) return 200;
  if (quantity >= 2) return 210;
  return 220;
};

// Metal seal prices
const getMetalSealPrice = (country: string): number => {
  return country === 'Ireland' || country === 'Northern Ireland' ? 7 : 5;
};

// Payment Schedule Builder Component
interface PaymentScheduleBuilderProps {
  totalAmount: number;
  schedule: PaymentInstallment[];
  onScheduleChange: (schedule: PaymentInstallment[]) => void;
  currencySymbol?: string;
}

const PaymentScheduleBuilder: React.FC<PaymentScheduleBuilderProps> = ({
  totalAmount,
  schedule,
  onScheduleChange,
  currencySymbol = '£'
}) => {
  const cs = currencySymbol;
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);
  
  const scheduledTotal = schedule.reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = totalAmount - scheduledTotal;
  
  const addInstallment = () => {
    const newInstallment: PaymentInstallment = {
      id: `inst-${Date.now()}`,
      amount: remainingAmount > 0 ? Math.min(remainingAmount, 100) : 0,
      date: format(addDays(today, 7), 'yyyy-MM-dd'),
      paid: false
    };
    onScheduleChange([...schedule, newInstallment]);
  };
  
  const updateInstallment = (id: string, field: 'amount' | 'date', value: number | string) => {
    onScheduleChange(
      schedule.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  const removeInstallment = (id: string) => {
    onScheduleChange(schedule.filter(item => item.id !== id));
  };
  
  const isValidSchedule = () => {
    if (schedule.length === 0) return false;
    if (Math.abs(scheduledTotal - totalAmount) > 0.01) return false;
    
    // Check all dates are within 30 days
    for (const item of schedule) {
      const itemDate = new Date(item.date);
      if (isBefore(itemDate, today) || isAfter(itemDate, maxDate)) {
        return false;
      }
    }
    return true;
  };
  
  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          Payment Schedule
        </h4>
        <div className="text-xs text-gray-500">
          Must be within 30 days (by {format(maxDate, 'MMM d, yyyy')})
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Scheduled: {cs}{scheduledTotal.toFixed(2)}</span>
          <span className={remainingAmount > 0.01 ? 'text-orange-600' : 'text-green-600'}>
            {remainingAmount > 0.01 ? `Remaining: ${cs}${remainingAmount.toFixed(2)}` : '✓ Fully scheduled'}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              scheduledTotal >= totalAmount ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min((scheduledTotal / totalAmount) * 100, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Installments List */}
      <div className="space-y-3">
        {schedule.map((installment, index) => (
          <div key={installment.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
              {index + 1}
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount ({cs})</label>
                <Input
                  type="number"
                  min="1"
                  max={totalAmount}
                  step="0.01"
                  value={installment.amount}
                  onChange={(e) => updateInstallment(installment.id, 'amount', parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Payment Date</label>
                <Input
                  type="date"
                  min={format(today, 'yyyy-MM-dd')}
                  max={format(maxDate, 'yyyy-MM-dd')}
                  value={installment.date}
                  onChange={(e) => updateInstallment(installment.id, 'date', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeInstallment(installment.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      {/* Add Installment Button */}
      {remainingAmount > 0.01 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addInstallment}
          className="w-full flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Payment Installment
        </Button>
      )}
      
      {/* Quick Fill Button */}
      {schedule.length === 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Split into 2 payments
              const half = totalAmount / 2;
              onScheduleChange([
                { id: 'inst-1', amount: half, date: format(addDays(today, 7), 'yyyy-MM-dd'), paid: false },
                { id: 'inst-2', amount: half, date: format(addDays(today, 21), 'yyyy-MM-dd'), paid: false }
              ]);
            }}
            className="flex-1 text-xs"
          >
            Split in 2
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Split into 3 payments
              const third = Math.floor(totalAmount / 3 * 100) / 100;
              const remainder = totalAmount - (third * 2);
              onScheduleChange([
                { id: 'inst-1', amount: third, date: format(addDays(today, 7), 'yyyy-MM-dd'), paid: false },
                { id: 'inst-2', amount: third, date: format(addDays(today, 14), 'yyyy-MM-dd'), paid: false },
                { id: 'inst-3', amount: remainder, date: format(addDays(today, 21), 'yyyy-MM-dd'), paid: false }
              ]);
            }}
            className="flex-1 text-xs"
          >
            Split in 3
          </Button>
        </div>
      )}
      
      {/* Validation Message */}
      {schedule.length > 0 && !isValidSchedule() && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="text-orange-700 dark:text-orange-300">
            {Math.abs(scheduledTotal - totalAmount) > 0.01 && (
              <p>Total scheduled ({cs}{scheduledTotal.toFixed(2)}) must equal bill amount ({cs}{totalAmount.toFixed(2)})</p>
            )}
          </div>
        </div>
      )}
      
      {schedule.length > 0 && isValidSchedule() && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-green-700 dark:text-green-300">
            <p className="font-medium">Payment schedule is valid!</p>
            <p className="text-xs mt-1">You'll receive reminders before each payment date.</p>
          </div>
        </div>
      )}
    </div>
  );
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
    includeTrunks: false,
    trunkQuantity: 0,
    wantMetalSeal: false,
    purchaseDrums: false,
    purchaseDrumType: null,
    purchaseDrumQuantity: 0,
    paymentMethod: 'standard',
    usePaymentSchedule: false,
    paymentSchedule: [],
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Initialize route cache on component mount
  useEffect(() => {
    initializeRouteCache();
  }, []);

  // Fetch collection schedule based on postal code or Ireland city
  const fetchCollectionSchedule = async (postcodeOrCity: string) => {
    if (!postcodeOrCity || postcodeOrCity.length < 2) {
      setCollectionRoute(null);
      setCollectionDate(null);
      return;
    }

    const isIreland = formData.pickupCountry === 'Ireland' || formData.pickupCountry === 'Northern Ireland';

    setLoadingSchedule(true);
    try {
      // Detect route from postal code (UK) or city (Ireland)
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

      // Try both formats: with and without " ROUTE" suffix
      // Database might store as "LONDON" or "LONDON ROUTE"
      const routeWithSuffix = route.includes(' ROUTE') ? route : `${route} ROUTE`;
      const routeWithoutSuffix = route.replace(' ROUTE', '');

      console.log('Fetching schedule for route:', route, '| Trying:', routeWithoutSuffix, 'and', routeWithSuffix);

      // Fetch collection date from database - try without suffix first
      let { data, error } = await supabase
        .from('collection_schedules')
        .select('pickup_date, route')
        .eq('route', routeWithoutSuffix)
        .single();

      // If not found, try with suffix
      if (error || !data) {
        const result = await supabase
          .from('collection_schedules')
          .select('pickup_date, route')
          .eq('route', routeWithSuffix)
          .single();
        data = result.data;
        error = result.error;
      }

      // If still not found, try case-insensitive search
      if (error || !data) {
        const result = await supabase
          .from('collection_schedules')
          .select('pickup_date, route')
          .ilike('route', `%${routeWithoutSuffix}%`)
          .limit(1)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching collection schedule:', error);
        setCollectionDate('To be confirmed');
      } else if (data) {
        console.log('Found schedule:', data);
        // Only set date if it's actually set (not "Not set", "To be confirmed", or empty)
        const pickupDate = data.pickup_date;
        if (pickupDate && 
            pickupDate !== 'Not set' && 
            pickupDate !== 'To be confirmed' &&
            pickupDate.trim() !== '') {
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

  // Effect to detect route when postal code changes
  useEffect(() => {
    if (formData.pickupPostcode) {
      fetchCollectionSchedule(formData.pickupPostcode);
    }
  }, [formData.pickupPostcode, formData.pickupCountry, formData.pickupCity]);

  const validateStep = (step: number): boolean => {
    const isIreland = formData.pickupCountry === 'Ireland' || formData.pickupCountry === 'Northern Ireland';

    switch (step) {
      case 1:
        // For Ireland, postal code is not required (city dropdown used instead)
        const postcodeRequired = !isIreland;

        if (!formData.senderFirstName || !formData.senderLastName || !formData.senderEmail ||
            !formData.senderPhone || !formData.pickupAddress || !formData.pickupCity ||
            (postcodeRequired && !formData.pickupPostcode)) {
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
        if (!formData.includeDrums && !formData.includeBoxes && !formData.includeTrunks) {
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
        if (formData.includeTrunks && formData.trunkQuantity < 1) {
          toast({
            title: 'Trunk Quantity',
            description: 'Please enter how many trunks/storage boxes you want to ship.',
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

  const isIrelandBooking = formData.pickupCountry === 'Ireland' || formData.pickupCountry === 'Northern Ireland';
  const currencySymbol = isIrelandBooking ? '€' : '£';

  const calculateBaseTotal = () => {
    let total = 0;

    // Drums pricing (different for UK vs Ireland)
    if (formData.includeDrums && formData.drumQuantity > 0) {
      const drumPrice = isIrelandBooking
        ? getIrelandDrumPrice(formData.drumQuantity)
        : getDrumPrice(formData.drumQuantity);
      total += formData.drumQuantity * drumPrice;
    }

    // Metal seal cost (different for UK vs Ireland)
    if (formData.wantMetalSeal && formData.includeDrums && formData.drumQuantity > 0) {
      const sealPrice = getMetalSealPrice(formData.pickupCountry);
      total += formData.drumQuantity * sealPrice;
    }

    // Trunks/Storage boxes (Ireland only)
    if (formData.includeTrunks && formData.trunkQuantity > 0) {
      const trunkPrice = getTrunkPrice(formData.trunkQuantity);
      total += formData.trunkQuantity * trunkPrice;

      // Metal seal for trunks (if selected)
      if (formData.wantMetalSeal) {
        const sealPrice = getMetalSealPrice(formData.pickupCountry);
        total += formData.trunkQuantity * sealPrice;
      }
    }

    // Add purchased drums cost (England only)
    if (formData.purchaseDrums && formData.purchaseDrumType && formData.purchaseDrumQuantity > 0) {
      const drumPurchasePrice = formData.purchaseDrumType === 'metal' ? 40 : 50;
      total += formData.purchaseDrumQuantity * drumPurchasePrice;
    }

    return total;
  };

  const calculateFinalTotal = () => {
    const baseTotal = calculateBaseTotal();

    // Apply payment method adjustments
    if (formData.paymentMethod === 'cashOnCollection' && formData.includeDrums) {
      // Cash discount: £20/drum for UK, €20/drum for Ireland
      return baseTotal - (formData.drumQuantity * 20);
    }
    if (formData.paymentMethod === 'payOnArrival') {
      return baseTotal * 1.20; // 20% premium
    }
    return baseTotal;
  };

  // Helper to get drum price based on country
  const getCurrentDrumPrice = (quantity: number) => {
    return isIrelandBooking ? getIrelandDrumPrice(quantity) : getDrumPrice(quantity);
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
      if (formData.includeTrunks && formData.trunkQuantity > 0) notes.push(`${formData.trunkQuantity} x Trunk/Storage Box`);
      if (formData.purchaseDrums && formData.purchaseDrumType && formData.purchaseDrumQuantity > 0) {
        notes.push(`Purchase ${formData.purchaseDrumQuantity} x ${formData.purchaseDrumType === 'metal' ? 'Metal Drum (£40)' : 'Plastic Barrel (£50)'}`);
      }
      
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
            pricePerDrum: getCurrentDrumPrice(formData.drumQuantity),
            totalPrice: formData.drumQuantity * getCurrentDrumPrice(formData.drumQuantity),
            currency: isIrelandBooking ? 'EUR' : 'GBP'
          } : null,
          trunks: formData.includeTrunks ? {
            quantity: formData.trunkQuantity,
            pricePerTrunk: getTrunkPrice(formData.trunkQuantity),
            totalPrice: formData.trunkQuantity * getTrunkPrice(formData.trunkQuantity),
            currency: 'EUR'
          } : null,
          boxes: formData.includeBoxes ? {
            description: formData.boxesDescription
          } : null,
          addOns: {
            metalSeal: formData.wantMetalSeal,
            metalSealPrice: getMetalSealPrice(formData.pickupCountry)
          },
          purchasedDrums: formData.purchaseDrums ? {
            type: formData.purchaseDrumType,
            quantity: formData.purchaseDrumQuantity,
            priceEach: formData.purchaseDrumType === 'metal' ? 40 : 50,
            totalPrice: formData.purchaseDrumQuantity * (formData.purchaseDrumType === 'metal' ? 40 : 50)
          } : null
        },
        pricing: {
          baseAmount: calculateBaseTotal(),
          finalAmount: finalAmount,
          paymentMethod: formData.paymentMethod,
          currency: isIrelandBooking ? 'EUR' : 'GBP'
        },
        collection: {
          route: collectionRoute,
          date: collectionDate
        },
        paymentSchedule: formData.usePaymentSchedule ? {
          enabled: true,
          installments: formData.paymentSchedule.map(inst => ({
            ...inst,
            paid: false,
            paidAmount: 0,
            paidDate: null
          })),
          totalScheduled: formData.paymentSchedule.reduce((sum, inst) => sum + inst.amount, 0),
          totalPaid: 0,
          remainingBalance: finalAmount
        } : null,
        shipmentDetails: {
          type: (() => {
            const types = [];
            if (formData.includeDrums) types.push('Drums');
            if (formData.includeTrunks) types.push('Trunks');
            if (formData.includeBoxes) types.push('Boxes/Items');
            return types.length > 0 ? types.join(' + ') : 'Standard';
          })(),
          includeDrums: formData.includeDrums,
          drumQuantity: formData.drumQuantity,
          includeTrunks: formData.includeTrunks,
          trunkQuantity: formData.trunkQuantity,
          includeOtherItems: formData.includeBoxes,
          wantMetalSeal: formData.wantMetalSeal,
          category: formData.boxesDescription
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
          currency: isIrelandBooking ? 'EUR' : 'GBP',
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
          currency: isIrelandBooking ? 'EUR' : 'GBP',
          payment_method: formData.paymentMethod,
          status: 'pending',
          sender_details: shipmentMetadata.sender,
          recipient_details: shipmentMetadata.recipient,
          shipment_details: shipmentMetadata.items,
          payment_info: {
            paymentMethod: formData.paymentMethod,
            baseAmount: calculateBaseTotal(),
            finalAmount: finalAmount,
            transactionId: paymentData.transaction_id,
            usePaymentSchedule: formData.usePaymentSchedule,
            paymentSchedule: formData.usePaymentSchedule ? JSON.parse(JSON.stringify(formData.paymentSchedule)) : null
          },
          collection_info: {
            pickupAddress: `${formData.pickupAddress}, ${formData.pickupCity}, ${formData.pickupPostcode}`,
            deliveryAddress: `${formData.deliveryAddress}, ${formData.deliveryCity}, Zimbabwe`,
            route: collectionRoute,
            collectionDate: collectionDate
          },
          payment_schedule: formData.usePaymentSchedule ? JSON.parse(JSON.stringify(formData.paymentSchedule)) : null
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

        {/* Country Selector */}
        <div>
          <Label htmlFor="country">Pickup Country</Label>
          <Select
            value={formData.pickupCountry}
            onValueChange={(value) => {
              updateField('pickupCountry', value);
              // Clear city and postcode when switching countries
              updateField('pickupCity', '');
              updateField('pickupPostcode', '');
              setCollectionRoute(null);
              setCollectionDate(null);
            }}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="England">England</SelectItem>
              <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
              <SelectItem value="Ireland">Ireland</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="address">Pickup Address</Label>
          <Input
            id="address"
            placeholder="123 Main Street"
            value={formData.pickupAddress}
            onChange={(e) => updateField('pickupAddress', e.target.value)}
          />
        </div>

        {/* Conditional: City autocomplete for Ireland, or City + Postal code for UK */}
        {formData.pickupCountry === 'Ireland' || formData.pickupCountry === 'Northern Ireland' ? (
          <div>
            <Label htmlFor="irelandCity">City</Label>
            <Input
              id="irelandCity"
              list="ireland-cities-list"
              placeholder="Start typing your city..."
              value={formData.pickupCity}
              onChange={(e) => {
                const value = e.target.value;
                updateField('pickupCity', value);
                // Set a placeholder postcode for Ireland
                updateField('pickupPostcode', 'N/A');
                // Try to detect route from city
                const route = getIrelandRouteForCity(value);
                if (route) {
                  setCollectionRoute(route);
                  fetchCollectionSchedule(value);
                } else {
                  setCollectionRoute(null);
                  setCollectionDate(null);
                }
              }}
            />
            <datalist id="ireland-cities-list">
              {irelandCities.map((item) => (
                <option key={item.city} value={item.city} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Type your city name - we'll show matching options
            </p>
          </div>
        ) : (
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
        )}

        {/* Collection Schedule Info */}
        {collectionRoute && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-300 mb-3">Collection Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Route */}
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900">
                    <div className="p-1.5 bg-emerald-500 rounded">
                      <Truck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Route</p>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">{collectionRoute}</p>
                    </div>
                  </div>
                  
                  {/* Collection Date */}
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900">
                    <div className="p-1.5 bg-amber-500 rounded">
                      <CalendarClock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Next Collection</p>
                      {loadingSchedule ? (
                        <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm italic">Loading...</p>
                      ) : (
                        <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                          {collectionDate || 'To be confirmed'}
                        </p>
                      )}
                    </div>
                  </div>
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
    const drumPrice = formData.drumQuantity > 0 ? getCurrentDrumPrice(formData.drumQuantity) : (isIrelandBooking ? 360 : 280);
    const metalSealPrice = getMetalSealPrice(formData.pickupCountry);
    const trunkPrice = formData.trunkQuantity > 0 ? getTrunkPrice(formData.trunkQuantity) : 220;

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
                {/* Show country-specific pricing */}
                {isIrelandBooking ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <div className="text-green-600 dark:text-green-400 font-medium">• 5+ drums: €340 each (Best value!)</div>
                    <div>• 2-4 drums: €350 each</div>
                    <div>• 1 drum: €360</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <div>• 5+ drums: £260 each</div>
                    <div>• 2-4 drums: £270 each</div>
                    <div>• 1 drum: £280</div>
                  </div>
                )}

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
                          {currencySymbol}{drumPrice} per drum
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
                          <div className="text-sm font-semibold text-zim-green mt-1">+{currencySymbol}{metalSealPrice}/drum</div>
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

          {/* Trunks/Storage Boxes Option - Ireland Only */}
          {isIrelandBooking && (
            <div className={`border-2 rounded-lg p-5 transition-all ${formData.includeTrunks ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600' : 'border-gray-200 hover:border-purple-400 dark:border-gray-700 dark:hover:border-purple-600'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeTrunks}
                  onChange={(e) => updateField('includeTrunks', e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Trunks / Storage Boxes</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <div className="text-purple-600 dark:text-purple-400 font-medium">• 5+ trunks: €200 each (Best value!)</div>
                    <div>• 2-4 trunks: €210 each</div>
                    <div>• 1 trunk: €220</div>
                  </div>

                  {formData.includeTrunks && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="trunkQty" className="text-base">How many trunks/storage boxes?</Label>
                        <Input
                          id="trunkQty"
                          type="number"
                          min="1"
                          placeholder="1"
                          value={formData.trunkQuantity || ''}
                          onChange={(e) => updateField('trunkQuantity', parseInt(e.target.value) || 0)}
                          className="max-w-xs mt-2"
                        />
                        {formData.trunkQuantity > 0 && (
                          <p className="text-sm text-purple-600 font-medium mt-2">
                            €{trunkPrice} per trunk
                          </p>
                        )}
                      </div>

                      {/* Optional Metal Seal for Trunks */}
                      <div className="border-t pt-4">
                        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.wantMetalSeal}
                            onChange={(e) => updateField('wantMetalSeal', e.target.checked)}
                            className="mt-0.5 h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Metal Coded Seal (Optional)</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Secure coded seals for trunks</div>
                            <div className="text-sm font-semibold text-purple-600 mt-1">+€{metalSealPrice}/trunk</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Purchase Drums Option - England Only */}
          {formData.pickupCountry === 'England' && (
            <div className={`border-2 rounded-lg p-5 transition-all ${formData.purchaseDrums ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 'border-gray-200 hover:border-blue-400 dark:border-gray-700 dark:hover:border-blue-600'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.purchaseDrums}
                  onChange={(e) => {
                    updateField('purchaseDrums', e.target.checked);
                    if (!e.target.checked) {
                      updateField('purchaseDrumType', null);
                      updateField('purchaseDrumQuantity', 0);
                    }
                  }}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Need to Purchase Drums?</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    We can supply drums for you at collection
                  </div>

                  {formData.purchaseDrums && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label className="text-base mb-3 block">Select drum type:</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Metal Drum Option */}
                          <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.purchaseDrumType === 'metal' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                            <input
                              type="radio"
                              name="drumType"
                              value="metal"
                              checked={formData.purchaseDrumType === 'metal'}
                              onChange={() => updateField('purchaseDrumType', 'metal')}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium">Metal Drum</div>
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">£40 each</div>
                            </div>
                          </label>

                          {/* Plastic Barrel Option */}
                          <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.purchaseDrumType === 'plastic' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                            <input
                              type="radio"
                              name="drumType"
                              value="plastic"
                              checked={formData.purchaseDrumType === 'plastic'}
                              onChange={() => updateField('purchaseDrumType', 'plastic')}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium">Plastic Barrel</div>
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">£50 each</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {formData.purchaseDrumType && (
                        <div>
                          <Label htmlFor="purchaseQty" className="text-base">How many drums to purchase?</Label>
                          <Input
                            id="purchaseQty"
                            type="number"
                            min="1"
                            placeholder="1"
                            value={formData.purchaseDrumQuantity || ''}
                            onChange={(e) => updateField('purchaseDrumQuantity', parseInt(e.target.value) || 0)}
                            className="max-w-xs mt-2"
                          />
                          {formData.purchaseDrumQuantity > 0 && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-2">
                              Total: £{formData.purchaseDrumQuantity * (formData.purchaseDrumType === 'metal' ? 40 : 50)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

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
                  <span className="font-medium">{currencySymbol}{formData.drumQuantity * getCurrentDrumPrice(formData.drumQuantity)}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  @ {currencySymbol}{getCurrentDrumPrice(formData.drumQuantity)} per drum
                </div>

                {/* Add-ons - Metal Seal for drums */}
                {formData.wantMetalSeal && (
                  <div className="flex justify-between text-gray-700 dark:text-gray-300 border-t pt-2">
                    <span>Metal Coded Seal ({formData.drumQuantity} x {currencySymbol}{getMetalSealPrice(formData.pickupCountry)})</span>
                    <span>+{currencySymbol}{formData.drumQuantity * getMetalSealPrice(formData.pickupCountry)}</span>
                  </div>
                )}

                {/* Purchased Drums - UK only */}
                {formData.purchaseDrums && formData.purchaseDrumType && formData.purchaseDrumQuantity > 0 && (
                  <div className="flex justify-between text-gray-700 dark:text-gray-300 border-t pt-2">
                    <span>
                      {formData.purchaseDrumQuantity} x {formData.purchaseDrumType === 'metal' ? 'Metal Drum' : 'Plastic Barrel'}
                      {' '}(£{formData.purchaseDrumType === 'metal' ? '40' : '50'} each)
                    </span>
                    <span>+£{formData.purchaseDrumQuantity * (formData.purchaseDrumType === 'metal' ? 40 : 50)}</span>
                  </div>
                )}

                {/* Included Services */}
                <div className="border-t pt-2 text-xs text-gray-500 dark:text-gray-400">
                  ✓ Insurance & Tracking included
                </div>
              </div>
            )}

            {/* Trunks Summary - Ireland only */}
            {formData.includeTrunks && formData.trunkQuantity > 0 && (
              <div className={formData.includeDrums ? 'border-t pt-3' : ''}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{formData.trunkQuantity} x Trunk/Storage Box</span>
                    <span className="font-medium">€{formData.trunkQuantity * getTrunkPrice(formData.trunkQuantity)}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    @ €{getTrunkPrice(formData.trunkQuantity)} per trunk
                  </div>

                  {/* Metal seal for trunks */}
                  {formData.wantMetalSeal && !formData.includeDrums && (
                    <div className="flex justify-between text-gray-700 dark:text-gray-300 border-t pt-2">
                      <span>Metal Coded Seal ({formData.trunkQuantity} x €{getMetalSealPrice(formData.pickupCountry)})</span>
                      <span>+€{formData.trunkQuantity * getMetalSealPrice(formData.pickupCountry)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.includeBoxes && (
              <div className={(formData.includeDrums || formData.includeTrunks) ? 'border-t pt-3' : ''}>
                <p className="font-medium text-gray-700 dark:text-gray-300">Boxes & Other Items:</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{formData.boxesDescription}</p>
                <p className="text-xs italic mt-2 text-blue-600 dark:text-blue-400">Custom quote will be provided</p>
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        {((formData.includeDrums && formData.drumQuantity > 0) || (formData.includeTrunks && formData.trunkQuantity > 0)) && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-zim-green">{currencySymbol}{calculateBaseTotal()}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.includeBoxes && '* Total shown is for drums/trunks only. Custom quote for other items will be sent separately.'}
              {!formData.includeBoxes && `Final amount for ${formData.includeDrums ? 'drums' : ''}${formData.includeDrums && formData.includeTrunks ? ' & ' : ''}${formData.includeTrunks ? 'trunks' : ''}`}
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
    const cs = currencySymbol; // shorthand for currency symbol

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
                    <span className="text-xl font-bold text-zim-green">{cs}{baseTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pay by card or schedule payments within 30 days</p>
                </div>
              </label>
              
              {/* Payment Schedule Option - Only show when standard is selected */}
              {formData.paymentMethod === 'standard' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="usePaymentSchedule"
                      checked={formData.usePaymentSchedule}
                      onChange={(e) => {
                        updateField('usePaymentSchedule', e.target.checked);
                        if (!e.target.checked) {
                          updateField('paymentSchedule', []);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-zim-green focus:ring-zim-green"
                    />
                    <label htmlFor="usePaymentSchedule" className="text-sm font-medium cursor-pointer">
                      I want to schedule split payments (within 30 days)
                    </label>
                  </div>
                  
                  {formData.usePaymentSchedule && (
                    <PaymentScheduleBuilder
                      totalAmount={baseTotal}
                      schedule={formData.paymentSchedule}
                      onScheduleChange={(schedule) => updateField('paymentSchedule', schedule)}
                      currencySymbol={cs}
                    />
                  )}
                </div>
              )}
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
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through mr-2">{cs}{baseTotal.toFixed(2)}</span>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">{cs}{cashTotal.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-xl font-bold text-zim-green">{cs}{baseTotal.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pay with cash when your items are collected</p>
                  
                  {formData.includeDrums && cashDiscount > 0 && (
                    <div className="flex items-start rounded-md bg-green-100 dark:bg-green-900/30 p-3 text-sm mt-2">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-green-800 dark:text-green-300">Save {cs}{cashDiscount}!</span>
                        <p className="text-green-700 dark:text-green-400">Get {cs}20 discount per drum when you pay cash</p>
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
                      <span className="text-sm text-gray-500 dark:text-gray-400 line-through mr-2">{cs}{baseTotal.toFixed(2)}</span>
                      <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{cs}{premiumTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pay when your shipment reaches Zimbabwe</p>
                  
                  <div className="flex items-start rounded-md bg-orange-100 dark:bg-orange-900/30 p-3 text-sm mt-2">
                    <AlertCircle className="mr-2 h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <span className="text-orange-700 dark:text-orange-400">This option adds a 20% premium (+{cs}{(premiumTotal - baseTotal).toFixed(2)}) to the total cost.</span>
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
                <span>{cs}{baseTotal.toFixed(2)}</span>
              </div>

              {formData.paymentMethod === 'cashOnCollection' && cashDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                  <span>Cash Discount:</span>
                  <span>-{cs}{cashDiscount.toFixed(2)}</span>
                </div>
              )}

              {formData.paymentMethod === 'payOnArrival' && (
                <div className="flex justify-between text-orange-600 dark:text-orange-400 font-medium">
                  <span>Payment Premium (20%):</span>
                  <span>+{cs}{(premiumTotal - baseTotal).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total to Pay:</span>
                <span className="text-zim-green">{cs}{calculateFinalTotal().toFixed(2)}</span>
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
        usePaymentSchedule={receiptData.usePaymentSchedule}
        paymentSchedule={receiptData.paymentSchedule}
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
            includeTrunks: false,
            trunkQuantity: 0,
            wantMetalSeal: false,
            purchaseDrums: false,
            purchaseDrumType: null,
            purchaseDrumQuantity: 0,
            paymentMethod: 'standard',
            usePaymentSchedule: false,
            paymentSchedule: [],
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
