
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { 
  getRouteNames, 
  getAreasByRoute, 
  getDateByRoute 
} from '@/data/collectionSchedule';
import { Package, Truck } from 'lucide-react';

const BookingForm = () => {
  const { toast } = useToast();
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
    specialInstructions: '',
    termsAccepted: false
  });

  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [pickupDate, setPickupDate] = useState<string>('');
  const routes = getRouteNames();

  // Update available areas when route changes
  useEffect(() => {
    if (formData.selectedRoute) {
      const areas = getAreasByRoute(formData.selectedRoute);
      setAvailableAreas(areas);
      setPickupDate(getDateByRoute(formData.selectedRoute));
      
      // Reset selected area when route changes
      setFormData(prev => ({ ...prev, selectedArea: '' }));
    } else {
      setAvailableAreas([]);
      setPickupDate('');
    }
  }, [formData.selectedRoute]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, termsAccepted: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
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
    
    // Submit form
    toast({
      title: "Booking Submitted",
      description: "Your shipment booking has been received successfully.",
    });
    
    // For demo purposes only: log the submission
    console.log("Form submitted:", formData);
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
      
      {/* Pickup Information */}
      <Card>
        <CardHeader>
          <CardTitle>Pickup Information</CardTitle>
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
            <Label htmlFor="pickupAddress">Pickup Address</Label>
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
            <Label htmlFor="pickupPostcode">Pickup Postcode</Label>
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
          <CardTitle>Delivery Information (Zimbabwe)</CardTitle>
          <CardDescription>Recipient details in Zimbabwe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
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
              <Label htmlFor="recipientPhone">Recipient Phone</Label>
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
            <Label htmlFor="deliveryAddress">Delivery Address (Zimbabwe)</Label>
            <Textarea
              id="deliveryAddress"
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleInputChange}
              required
              placeholder="Enter full delivery address in Zimbabwe"
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
              placeholder="Enter city/town in Zimbabwe"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Shipment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
          <CardDescription>Provide information about your shipment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Shipment Type</Label>
            <RadioGroup 
              value={formData.shipmentType} 
              onValueChange={(value) => handleSelectChange('shipmentType', value)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-3 rounded-md border p-4">
                <RadioGroupItem value="drum" id="drum" />
                <Label htmlFor="drum" className="flex flex-1 items-center gap-2 font-normal">
                  <Package className="h-5 w-5" />
                  <span>Drum Shipping (200L capacity)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-md border p-4">
                <RadioGroupItem value="parcel" id="parcel" />
                <Label htmlFor="parcel" className="flex flex-1 items-center gap-2 font-normal">
                  <Package className="h-5 w-5" />
                  <span>Regular Parcel</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {formData.shipmentType === 'drum' ? (
            <div className="space-y-2">
              <Label htmlFor="drumQuantity">Number of Drums</Label>
              <Select
                value={formData.drumQuantity}
                onValueChange={(value) => handleSelectChange('drumQuantity', value)}
              >
                <SelectTrigger id="drumQuantity">
                  <SelectValue placeholder="Select quantity" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Drum' : 'Drums'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Pricing: 1 Drum: £260 | 2-4 Drums: £250 each | 5+ Drums: £220 each
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="weight">Package Weight (kg)</Label>
              <Input 
                id="weight"
                name="weight"
                type="number" 
                min="1"
                value={formData.weight}
                onChange={handleInputChange}
                required={formData.shipmentType === 'parcel'}
                placeholder="Enter weight in kg"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Regular parcel pricing: £50 per kg
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleInputChange}
              placeholder="Enter any special instructions or notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Terms and Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3 mb-6">
            <Checkbox 
              id="termsAccepted" 
              checked={formData.termsAccepted}
              onCheckedChange={handleCheckboxChange}
            />
            <Label 
              htmlFor="termsAccepted" 
              className="text-sm font-normal leading-relaxed"
            >
              I agree to the Terms and Conditions, including acceptance of the shipping rates, collection schedule, and delivery policies.
            </Label>
          </div>
          
          <Button type="submit" className="w-full bg-zim-green hover:bg-zim-green/90">
            Complete Booking
          </Button>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            By submitting this form, you consent to our processing of your information in accordance with our Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </form>
  );
};

export default BookingForm;
