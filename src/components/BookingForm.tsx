
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useShipping } from '@/contexts/ShippingContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  getRouteNames, 
  getAreasByRoute, 
  getDateByRoute,
  syncSchedulesWithDatabase
} from '@/data/collectionSchedule';
import { Package, Truck, AlertTriangle, CreditCard, PoundSterling, Banknote, CreditCard as CreditCardIcon } from 'lucide-react';

// List of restricted rural areas
const RESTRICTED_RURAL_AREAS = [
  'Binga', 'Gokwe', 'Beitbridge Outskirts', 'Chipinge Rural', 'Mutare Rural', 
  'Rushinga', 'Muzarabani', 'Mbire', 'Centenary', 'Chiredzi Rural', 'Mwenezi'
];

// List of shipping items
const SHIPPING_ITEMS = [
  'Bicycle', 'Bin', 'Plastic Tubs', 'Washing Machine', 'Dishwasher', 'Dryer', 'Ironing Board', 
  'Wheelchair', 'Adult Walking Aid', 'Mobility Scooter', 'Car Wheels/Tyres', 'Sofas', 'Chairs', 
  'Kids Push Chair', 'Trampoline', 'Dining Chairs', 'Dining Table', 'Coffee Table', 
  'Rugs/Carpets', 'Internal Doors', 'External Doors', 'Vehicle Parts', 'Engine', 'Boxes', 
  'Bags', 'Suitcase', 'Beds', 'Mattress', 'Dismantled Wardrobe', 'Chest of Drawers', 
  'Dressing Unit', 'Wall Frames', 'Mirror', 'Pallet', 'Furniture', 'TVs', 'Tool Box', 
  'Air Compressor', 'Generator', 'Solar Panels', 'Amazon Bags', 'Changani Bags', 
  'Garden Tools', 'Lawn Mower', 'Bathroom Equipment', 'American Fridge', 'Standard Fridge Freezer', 
  'Deep Freezer', 'Water Pump', 'Heater', 'Air Conditioner', 'Office Equipment', 'Building Equipment', 'Ladder'
];

// Categorized shipping items
const CATEGORIZED_SHIPPING_ITEMS = {
  'Furniture': ['Sofas', 'Chairs', 'Dining Chairs', 'Dining Table', 'Coffee Table', 'Beds', 'Dismantled Wardrobe', 'Chest of Drawers', 'Dressing Unit'],
  'Household Appliances': ['Washing Machine', 'Dishwasher', 'Dryer', 'American Fridge', 'Standard Fridge Freezer', 'Deep Freezer', 'Heater', 'Air Conditioner'],
  'Mobility & Personal': ['Bicycle', 'Wheelchair', 'Adult Walking Aid', 'Mobility Scooter', 'Kids Push Chair'],
  'Storage & Containers': ['Bin', 'Plastic Tubs', 'Boxes', 'Bags', 'Suitcase', 'Amazon Bags', 'Changani Bags'],
  'Garden & Outdoor': ['Trampoline', 'Garden Tools', 'Lawn Mower'],
  'Building & Materials': ['Internal Doors', 'External Doors', 'Rugs/Carpets', 'Building Equipment', 'Ladder'],
  'Automotive': ['Car Wheels/Tyres', 'Vehicle Parts', 'Engine'],
  'Electronics & Equipment': ['TVs', 'Tool Box', 'Air Compressor', 'Generator', 'Solar Panels', 'Water Pump', 'Office Equipment'],
  'Miscellaneous': ['Ironing Board', 'Wall Frames', 'Mirror', 'Pallet', 'Furniture', 'Bathroom Equipment']
};

interface BookingFormProps {
  onSubmitComplete?: (data: any, shipmentId: string, amount: number) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useShipping();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    selectedRoute: '',
    selectedArea: '',
    pickupAddress: '',
    pickupPostcode: '',
    recipientName: '',
    recipientPhone: '',
    deliveryAddress: '',
    deliveryCity: '',
    shipmentType: 'drum',
    drumQuantity: '1',
    weight: '',
    dimensions: '',
    otherItems: [] as string[],
    customItem: '',
    paymentOption: 'immediate',
    paymentMethod: 'card',
    specialInstructions: '',
    termsAccepted: false
  });

  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [routes, setRoutes] = useState<string[]>([]);
  const [ruralAreaWarning, setRuralAreaWarning] = useState(false);
  const [showOtherItemInput, setShowOtherItemInput] = useState(false);
  const [paymentTab, setPaymentTab] = useState('immediate');

  // Calculate the total amount
  const calculateAmount = () => {
    let baseAmount = 0;
    
    // Base pricing
    if (formData.shipmentType === 'drum') {
      const quantity = parseInt(formData.drumQuantity);
      if (quantity === 1) {
        baseAmount = 260;
      } else if (quantity >= 2 && quantity <= 4) {
        baseAmount = quantity * 250;
      } else if (quantity >= 5) {
        baseAmount = quantity * 220;
      }
    } else if (formData.shipmentType === 'parcel' && formData.weight) {
      baseAmount = parseFloat(formData.weight) * 50;
    } else if (formData.shipmentType === 'other' && formData.otherItems.length > 0) {
      // Each item is £100 base price
      baseAmount = formData.otherItems.length * 100;
    }
    
    // Add door-to-door delivery fee
    baseAmount += 25;
    
    // Payment options
    if (formData.paymentOption === 'onArrival') {
      // Add 20% premium for Pay on Goods Arriving
      baseAmount = baseAmount * 1.2;
    } else if (formData.paymentOption === 'immediate' && formData.paymentMethod === 'cash') {
      // 5% discount for cash payment on collection
      baseAmount = baseAmount * 0.95;
    }
    
    return baseAmount;
  };

  React.useEffect(() => {
    const loadData = async () => {
      await syncSchedulesWithDatabase();
      
      const routeNames = getRouteNames();
      setRoutes(routeNames);
      
      if (formData.selectedRoute) {
        const areas = getAreasByRoute(formData.selectedRoute);
        setAvailableAreas(areas);
        setPickupDate(getDateByRoute(formData.selectedRoute));
        
        setFormData(prev => ({ ...prev, selectedArea: '' }));
      } else {
        setAvailableAreas([]);
        setPickupDate('');
      }
    };
    
    loadData();
  }, [formData.selectedRoute]);

  // Check for rural areas in delivery address
  useEffect(() => {
    const checkRuralArea = () => {
      const addressText = `${formData.deliveryAddress} ${formData.deliveryCity}`.toLowerCase();
      const isRural = RESTRICTED_RURAL_AREAS.some(area => 
        addressText.includes(area.toLowerCase())
      );
      
      setRuralAreaWarning(isRural);
    };
    
    checkRuralArea();
  }, [formData.deliveryAddress, formData.deliveryCity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If changing payment option, update the payment tab
    if (name === 'paymentOption') {
      setPaymentTab(value);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, termsAccepted: checked }));
  };

  const handleOtherItemChange = (item: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        otherItems: [...prev.otherItems, item]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        otherItems: prev.otherItems.filter(i => i !== item)
      }));
    }
  };

  const handleCustomItemAdd = () => {
    if (formData.customItem.trim()) {
      setFormData(prev => ({
        ...prev,
        otherItems: [...prev.otherItems, formData.customItem.trim()],
        customItem: ''
      }));
    }
  };

  const generateTrackingNumber = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let tracking = '';
    
    for (let i = 0; i < 4; i++) {
      tracking += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    for (let i = 0; i < 4; i++) {
      tracking += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return tracking;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.termsAccepted) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must accept the terms and conditions to proceed.",
      });
      return;
    }
    
    if (!formData.selectedRoute || !formData.selectedArea) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select both a route and an area for collection.",
      });
      return;
    }
    
    if (!formData.pickupAddress || !formData.deliveryAddress) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in both pickup and delivery address fields.",
      });
      return;
    }
    
    if (ruralAreaWarning) {
      toast({
        variant: "destructive",
        title: "Rural Area Restriction",
        description: "We do not deliver to the specified rural area. Please choose an urban area destination.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const trackingNumber = generateTrackingNumber();
      
      let weightValue = null;
      let dimensionsValue = null;
      
      if (formData.shipmentType === 'drum') {
        weightValue = parseInt(formData.drumQuantity) * 25;
        dimensionsValue = `${formData.drumQuantity} x 200L Drum`;
      } else if (formData.shipmentType === 'parcel' && formData.weight) {
        weightValue = parseFloat(formData.weight);
        dimensionsValue = formData.dimensions || 'Regular Parcel';
      } else if (formData.shipmentType === 'other') {
        dimensionsValue = formData.otherItems.join(', ');
      }
      
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const origin = `${formData.pickupAddress}, ${formData.pickupPostcode}`;
      const destination = `${formData.deliveryAddress}, ${formData.deliveryCity}, Zimbabwe`;

      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      const metaData = {
        shipment_type: formData.shipmentType,
        drum_quantity: formData.shipmentType === 'drum' ? parseInt(formData.drumQuantity) : null,
        other_items: formData.shipmentType === 'other' ? formData.otherItems : null,
        pickup_route: formData.selectedRoute,
        pickup_area: formData.selectedArea,
        pickup_date: pickupDate,
        sender_name: fullName,
        sender_email: formData.email,
        sender_phone: formData.phone,
        recipient_name: formData.recipientName,
        recipient_phone: formData.recipientPhone,
        special_instructions: formData.specialInstructions || null,
        payment_option: formData.paymentOption,
        payment_method: formData.paymentMethod
      };
      
      const amount = calculateAmount();
      
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          user_id: user?.id || null,
          tracking_number: trackingNumber,
          origin: origin,
          destination: destination,
          status: 'Booking Confirmed',
          weight: weightValue,
          dimensions: dimensionsValue,
          carrier: 'ZimExpress',
          estimated_delivery: twoWeeksFromNow.toISOString(),
          metadata: metaData
        })
        .select('id')
        .single();

      if (error) throw error;
      
      if (onSubmitComplete) {
        onSubmitComplete(formData, data.id, amount);
      } else {
        toast({
          title: "Booking Confirmed",
          description: `Your shipment has been booked with tracking number: ${trackingNumber}`,
        });
        
        if (user) {
          navigate('/dashboard');
        } else {
          navigate('/track');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error processing booking",
        description: error.message || "An error occurred while processing your booking.",
        variant: "destructive",
      });
      console.error("Booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>Please provide your contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                placeholder="Enter your last name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="youremail@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Collection Information */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Information</CardTitle>
          <CardDescription>Select the collection route and area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="selectedRoute">Collection Route</Label>
              <Select
                value={formData.selectedRoute}
                onValueChange={(value) => handleSelectChange('selectedRoute', value)}
              >
                <SelectTrigger id="selectedRoute">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route} value={route}>
                      {route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="selectedArea">Collection Area</Label>
              <Select
                value={formData.selectedArea}
                onValueChange={(value) => handleSelectChange('selectedArea', value)}
                disabled={!formData.selectedRoute}
              >
                <SelectTrigger id="selectedArea">
                  <SelectValue placeholder="Select an area" />
                </SelectTrigger>
                <SelectContent>
                  {availableAreas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {pickupDate && (
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck size={18} />
                <span>Collection Date:</span>
              </div>
              <p className="text-lg font-medium mt-1">{pickupDate}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Collection Address</Label>
            <Textarea
              id="pickupAddress"
              name="pickupAddress"
              value={formData.pickupAddress}
              onChange={handleInputChange}
              required
              placeholder="Enter your full pickup address"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pickupPostcode">Collection Postcode</Label>
            <Input 
              id="pickupPostcode"
              name="pickupPostcode"
              value={formData.pickupPostcode}
              onChange={handleInputChange}
              required
              placeholder="Enter pickup postcode"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Information </CardTitle>
          <CardDescription>Receiver details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Receiver Name</Label>
              <Input 
                id="recipientName"
                name="recipientName"
                value={formData.recipientName}
                onChange={handleInputChange}
                required
                placeholder="Enter recipient's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientPhone">Receiver Phone</Label>
              <Input 
                id="recipientPhone"
                name="recipientPhone"
                value={formData.recipientPhone}
                onChange={handleInputChange}
                required
                placeholder="Enter recipient's phone number"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address </Label>
            <Textarea
              id="deliveryAddress"
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleInputChange}
              required
              placeholder="Enter full delivery address "
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deliveryCity">City/Town</Label>
            <Input 
              id="deliveryCity"
              name="deliveryCity"
              value={formData.deliveryCity}
              onChange={handleInputChange}
              required
              placeholder="Enter delivery city/town"
            />
          </div>
          
          {ruralAreaWarning && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Rural Area Restriction</AlertTitle>
              <AlertDescription>
                We currently do not deliver to rural areas including {RESTRICTED_RURAL_AREAS.join(', ')}. 
                Please select an urban area destination.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Shipment Details */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Shipment Details</CardTitle>
          <CardDescription className="dark:text-gray-300">Provide information about your shipment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="dark:text-white">Shipment Type</Label>
            <RadioGroup 
              value={formData.shipmentType} 
              onValueChange={(value) => handleSelectChange('shipmentType', value)}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                <RadioGroupItem value="drum" id="drum" />
                <Label htmlFor="drum" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                  <Package className="h-5 w-5" />
                  <span>Drum Shipping (200L-220L capacity)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                <RadioGroupItem value="parcel" id="parcel" />
                <Label htmlFor="parcel" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                  <Package className="h-5 w-5" />
                  <span>Regular Parcel</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                  <Package className="h-5 w-5" />
                  <span>Other Items</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {formData.shipmentType === 'drum' && (
            <div className="space-y-2">
              <Label htmlFor="drumQuantity" className="dark:text-white">Number of Drums</Label>
              <Select
                value={formData.drumQuantity}
                onValueChange={(value) => handleSelectChange('drumQuantity', value)}
              >
                <SelectTrigger id="drumQuantity" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select quantity" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()} className="dark:text-white dark:focus:bg-gray-700">
                      {num} {num === 1 ? 'Drum' : 'Drums'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                Pricing: 1 Drum: {formatPrice(260)} | 2-4 Drums: {formatPrice(250)} each | 5+ Drums: {formatPrice(220)} each
              </p>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                Door-to-door delivery: {formatPrice(25)}
              </p>
            </div>
          )}
          
          {formData.shipmentType === 'parcel' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="dark:text-white">Package Weight (kg)</Label>
                <Input 
                  id="weight"
                  name="weight"
                  type="number" 
                  min="1"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required={formData.shipmentType === 'parcel'}
                  placeholder="Enter weight in kg"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dimensions" className="dark:text-white">Dimensions (Optional)</Label>
                <Input 
                  id="dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  placeholder="e.g., 30cm x 40cm x 20cm"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                Regular parcel pricing: {formatPrice(50)} per kg
              </p>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                Door-to-door delivery: {formatPrice(25)}
              </p>
            </div>
          )}
          
          {formData.shipmentType === 'other' && (
            <div className="space-y-4">
              <Label className="dark:text-white">Select Items</Label>
              
              <div className="space-y-4">
                {Object.entries(CATEGORIZED_SHIPPING_ITEMS).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-md font-medium dark:text-white">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`item-${item}`}
                            checked={formData.otherItems.includes(item)}
                            onCheckedChange={(checked) => 
                              handleOtherItemChange(item, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`item-${item}`}
                            className="text-sm font-normal dark:text-gray-300"
                          >
                            {item}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="other-item"
                    checked={showOtherItemInput}
                    onCheckedChange={(checked) => 
                      setShowOtherItemInput(checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor="other-item"
                    className="font-normal dark:text-white"
                  >
                    Other item not listed
                  </Label>
                </div>
                
                {showOtherItemInput && (
                  <div className="flex space-x-2 mt-2">
                    <Input 
                      id="customItem"
                      name="customItem"
                      value={formData.customItem}
                      onChange={handleInputChange}
                      placeholder="Enter item name"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={handleCustomItemAdd}
                      className="whitespace-nowrap"
                    >
                      Add Item
                    </Button>
                  </div>
                )}
              </div>
              
              {formData.otherItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h4 className="font-medium mb-2 dark:text-white">Selected Items:</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.otherItems.map(item => (
                      <Badge 
                        key={item}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleOtherItemChange(item, false)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm mt-4 dark:text-gray-300">
                    Base pricing: {formatPrice(100)} per item + door-to-door delivery: {formatPrice(25)}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="specialInstructions" className="dark:text-white">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleInputChange}
              placeholder="Enter any special instructions or notes"
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Payment Options */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Payment Options</CardTitle>
          <CardDescription className="dark:text-gray-300">Choose how and when you want to pay</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={paymentTab} onValueChange={(value) => {
            setPaymentTab(value);
            handleSelectChange('paymentOption', value);
          }}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="immediate">Pay Now</TabsTrigger>
              <TabsTrigger value="onArrival">Pay on Arrival</TabsTrigger>
              <TabsTrigger value="later">Pay Later</TabsTrigger>
            </TabsList>
            
            <TabsContent value="immediate" className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2 text-green-800 dark:text-green-300">
                  Special Deal for Cash on Collection!
                </h3>
                <p className="text-green-700 dark:text-green-400 mb-4">
                  Pay with cash during collection and get 5% off your total shipping cost!
                </p>
                
                <RadioGroup 
                  value={formData.paymentMethod} 
                  onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-3 rounded-md border border-green-200 dark:border-green-800 p-4 bg-white dark:bg-gray-800">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                      <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <span className="font-medium">Cash on Collection (5% discount)</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pay with cash when we collect your items</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                      <CreditCardIcon className="h-5 w-5" />
                      <div>
                        <span className="font-medium">Card Payment</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pay now with credit or debit card</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Price display */}
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="dark:text-gray-300">Base price:</span>
                  <span className="font-medium dark:text-white">
                    {formatPrice(calculateAmount() - 25)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="dark:text-gray-300">Door-to-door delivery:</span>
                  <span className="font-medium dark:text-white">{formatPrice(25)}</span>
                </div>
                {formData.paymentMethod === 'cash' && (
                  <div className="flex justify-between mb-2 text-green-600 dark:text-green-400">
                    <span>Cash discount (5%):</span>
                    <span>-{formatPrice(calculateAmount() * 0.05)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-bold dark:text-white">Total:</span>
                  <span className="font-bold dark:text-white">{formatPrice(calculateAmount())}</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="onArrival" className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2 text-yellow-800 dark:text-yellow-300">
                  Pay on Goods Arriving
                </h3>
                <p className="text-yellow-700 dark:text-yellow-400">
                  This option includes a 20% premium on the standard price. Payment will be required before goods can be released in Zimbabwe.
                </p>
              </div>
              
              {/* Price calculation with 20% premium */}
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="dark:text-gray-300">Base price:</span>
                  <span className="font-medium dark:text-white">
                    {formatPrice((calculateAmount() / 1.2) - 25)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="dark:text-gray-300">Door-to-door delivery:</span>
                  <span className="font-medium dark:text-white">{formatPrice(25)}</span>
                </div>
                <div className="flex justify-between mb-2 text-yellow-600 dark:text-yellow-400">
                  <span>Pay on arrival premium (20%):</span>
                  <span>{formatPrice(calculateAmount() - (calculateAmount() / 1.2))}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-bold dark:text-white">Total to pay on arrival:</span>
                  <span className="font-bold dark:text-white">{formatPrice(calculateAmount())}</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="later" className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2 text-blue-800 dark:text-blue-300">
                  Pay Later (Within 30 Days)
                </h3>
                <p className="text-blue-700 dark:text-blue-400">
                  You'll have a flexible 30-day payment period starting from the collection date.
                </p>
              </div>
              
              <RadioGroup 
                value={formData.paymentMethod} 
                onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                  <RadioGroupItem value="cash" id="cash-later" />
                  <Label htmlFor="cash-later" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                    <PoundSterling className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Cash Payment</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay cash within 30 days</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                  <RadioGroupItem value="transfer" id="transfer" />
                  <Label htmlFor="transfer" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                    <CreditCardIcon className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Bank Transfer</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay via bank transfer within 30 days</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border p-4 dark:border-gray-700">
                  <RadioGroupItem value="direct-debit" id="direct-debit" />
                  <Label htmlFor="direct-debit" className="flex flex-1 items-center gap-2 font-normal dark:text-white">
                    <CreditCardIcon className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Direct Debit</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Set up a direct debit payment</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              {/* Price display */}
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="dark:text-gray-300">Base price:</span>
                  <span className="font-medium dark:text-white">
                    {formatPrice(calculateAmount() - 25)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="dark:text-gray-300">Door-to-door delivery:</span>
                  <span className="font-medium dark:text-white">{formatPrice(25)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-bold dark:text-white">Total to pay within 30 days:</span>
                  <span className="font-bold dark:text-white">{formatPrice(calculateAmount())}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Terms and Submit */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3 mb-6">
            <Checkbox 
              id="termsAccepted" 
              checked={formData.termsAccepted}
              onCheckedChange={handleCheckboxChange}
            />
            <Label 
              htmlFor="termsAccepted" 
              className="text-sm font-normal leading-relaxed dark:text-white"
            >
              I agree to the Terms and Conditions, including acceptance of the shipping rates, collection schedule, and delivery policies.
            </Label>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-zim-green hover:bg-zim-green/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              formData.paymentOption === 'immediate' ? "Proceed to Payment" : "Complete Booking"
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground dark:text-gray-400 mt-4">
            By submitting this form, you consent to our processing of your information in accordance with our Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </form>
  );
};

export default BookingForm;
