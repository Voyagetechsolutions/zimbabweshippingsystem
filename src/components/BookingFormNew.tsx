import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { PlusCircle, MinusCircle } from 'lucide-react';
import { countries } from '@/constants/countries';
import { paymentOptions } from '@/constants/paymentOptions';
import { useIsMobile } from '@/hooks/use-mobile';

const BookingFormNew = ({ onSubmitComplete }) => {
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pickupAddress: '',
    pickupPostcode: '',
    pickupCity: '',
    pickupCountry: 'England',
    recipientName: '',
    recipientPhone: '',
    additionalRecipientPhone: '',
    deliveryAddress: '',
    deliveryCity: '',
    includeDrums: false,
    drumQuantity: '',
    wantMetalSeal: false,
    includeOtherItems: false,
    itemCategory: '',
    specificItem: '',
    otherItemDescription: '',
    shipmentType: 'parcel',
    weight: '',
    doorToDoor: false,
    additionalDeliveryAddresses: [],
    paymentOption: 'standard',
    paymentMethod: 'card',
    payLaterMethod: '',
    collectionDate: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [shipmentId, setShipmentId] = useState(uuidv4());
  const [amount, setAmount] = useState(0);
  const [includeDrums, setIncludeDrums] = useState(false);
  const [includeOtherItems, setIncludeOtherItems] = useState(false);
  const [pickupCountry, setPickupCountry] = useState('England');
  const [paymentOption, setPaymentOption] = useState('standard');
  const isMobile = useIsMobile();

  useEffect(() => {
    setShipmentId(`shp_${uuidv4()}`);
  }, []);

  useEffect(() => {
    setIncludeDrums(formValues.includeDrums);
    setIncludeOtherItems(formValues.includeOtherItems);
    setPickupCountry(formValues.pickupCountry);
    setPaymentOption(formValues.paymentOption);
  }, [formValues.includeDrums, formValues.includeOtherItems, formValues.pickupCountry, formValues.paymentOption]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleAddAddress = () => {
    setFormValues(prev => ({
      ...prev,
      additionalDeliveryAddresses: [...prev.additionalDeliveryAddresses, { address: '', city: '' }]
    }));
  };

  const handleRemoveAddress = (index) => {
    const newAddresses = [...formValues.additionalDeliveryAddresses];
    newAddresses.splice(index, 1);
    setFormValues(prev => ({
      ...prev,
      additionalDeliveryAddresses: newAddresses
    }));
  };

  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...formValues.additionalDeliveryAddresses];
    newAddresses[index][field] = value;
    setFormValues(prev => ({
      ...prev,
      additionalDeliveryAddresses: newAddresses
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    const requiredFields = {
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone Number",
      pickupAddress: "Pickup Address",
      pickupPostcode: pickupCountry === 'England' ? "Pickup Postcode" : null,
      pickupCity: pickupCountry !== 'England' ? "Pickup City" : null,
      recipientName: "Recipient Name",
      recipientPhone: "Recipient Phone",
      deliveryAddress: "Delivery Address",
      deliveryCity: "Delivery City",
    };
    
    // Add conditional required fields
    if (includeDrums) {
      requiredFields.drumQuantity = "Drum Quantity";
    }
    
    if (includeOtherItems) {
      requiredFields.itemCategory = "Item Category";
      requiredFields.otherItemDescription = "Item Description";
    }
    
    // Validate required fields
    const errors = [];
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (label && !formValues[field]) {
        errors.push(`${label} is required`);
      }
    });
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formValues.email && !emailRegex.test(formValues.email)) {
      errors.push("Please enter a valid email address");
    }
    
    // Validate phone numbers
    const phoneRegex = /^\+?[0-9\s()-]{8,20}$/;
    if (formValues.phone && !phoneRegex.test(formValues.phone)) {
      errors.push("Please enter a valid phone number");
    }
    if (formValues.recipientPhone && !phoneRegex.test(formValues.recipientPhone)) {
      errors.push("Please enter a valid recipient phone number");
    }
    
    // Validate drum quantity if needed
    if (includeDrums && formValues.drumQuantity) {
      const quantity = parseInt(formValues.drumQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push("Please enter a valid drum quantity");
      }
    }
    
    // Check if at least one shipment type is selected
    if (!includeDrums && !includeOtherItems) {
      errors.push("Please select at least one shipment type (Drums or Other Items)");
    }
    
    // If there are validation errors, show them and return without submitting
    if (errors.length > 0) {
      setIsLoading(false);
      toast({
        title: "Form Validation Error",
        description: (
          <ul className="list-disc pl-4">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate calculating the amount based on form values
      const calculatedAmount = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
      setAmount(calculatedAmount);

      // Call the onSubmitComplete function with the form data, shipment ID, and amount
      await onSubmitComplete(formValues, shipmentId, calculatedAmount);
      toast({
        title: "Form Submitted",
        description: "Your booking is being processed.",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit the form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Shipment Details</CardTitle>
        <CardDescription>Enter the details for your shipment.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                type="text"
                id="firstName"
                name="firstName"
                value={formValues.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                type="text"
                id="lastName"
                name="lastName"
                value={formValues.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formValues.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                type="tel"
                id="phone"
                name="phone"
                value={formValues.phone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickupAddress">Pickup Address</Label>
              <Input
                type="text"
                id="pickupAddress"
                name="pickupAddress"
                value={formValues.pickupAddress}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="pickupCountry">Pickup Country</Label>
              <Select value={formValues.pickupCountry} onValueChange={(value) => setFormValues(prev => ({ ...prev, pickupCountry: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {pickupCountry === 'England' ? (
            <div>
              <Label htmlFor="pickupPostcode">Pickup Postcode</Label>
              <Input
                type="text"
                id="pickupPostcode"
                name="pickupPostcode"
                value={formValues.pickupPostcode}
                onChange={handleInputChange}
                required
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="pickupCity">Pickup City</Label>
              <Input
                type="text"
                id="pickupCity"
                name="pickupCity"
                value={formValues.pickupCity}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                type="text"
                id="recipientName"
                name="recipientName"
                value={formValues.recipientName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="recipientPhone">Recipient Phone</Label>
              <Input
                type="tel"
                id="recipientPhone"
                name="recipientPhone"
                value={formValues.recipientPhone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="additionalRecipientPhone">Additional Recipient Phone (Optional)</Label>
            <Input
              type="tel"
              id="additionalRecipientPhone"
              name="additionalRecipientPhone"
              value={formValues.additionalRecipientPhone}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Input
                type="text"
                id="deliveryAddress"
                name="deliveryAddress"
                value={formValues.deliveryAddress}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="deliveryCity">Delivery City</Label>
              <Input
                type="text"
                id="deliveryCity"
                name="deliveryCity"
                value={formValues.deliveryCity}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="collectionDate">Collection Date</Label>
              <Input
                type="date"
                id="collectionDate"
                name="collectionDate"
                value={formValues.collectionDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <Label>
              <Checkbox
                checked={formValues.doorToDoor}
                onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, doorToDoor: checked }))}
                name="doorToDoor"
                id="doorToDoor"
              />
              <span className="ml-2">Door to Door Delivery</span>
            </Label>
          </div>

          {formValues.doorToDoor && (
            <div>
              <Label>Additional Delivery Addresses</Label>
              {formValues.additionalDeliveryAddresses.map((address, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Address"
                    value={address.address}
                    onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                    className="flex-grow"
                  />
                  <Input
                    type="text"
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                    className="w-32"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAddress(index)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" onClick={handleAddAddress}>
                Add Address <PlusCircle className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="border rounded-md p-4">
            <Label>
              <Checkbox
                checked={formValues.includeDrums}
                onCheckedChange={(checked) => {
                  setFormValues(prev => ({ ...prev, includeDrums: checked }));
                }}
                name="includeDrums"
                id="includeDrums"
              />
              <span className="ml-2">Include Drums (200L-220L)</span>
            </Label>
            {formValues.includeDrums && (
              <div className="mt-2">
                <Label htmlFor="drumQuantity">Number of Drums</Label>
                <Input
                  type="number"
                  id="drumQuantity"
                  name="drumQuantity"
                  value={formValues.drumQuantity}
                  onChange={handleInputChange}
                  required
                />
                <Label className="mt-2 flex items-center">
                  <Checkbox
                    checked={formValues.wantMetalSeal}
                    onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, wantMetalSeal: checked }))}
                    name="wantMetalSeal"
                    id="wantMetalSeal"
                  />
                  <span className="ml-2">Want Metal Coded Seals? (£5 per seal)</span>
                </Label>
              </div>
            )}
          </div>

          <div className="border rounded-md p-4">
            <Label>
              <Checkbox
                checked={formValues.includeOtherItems}
                onCheckedChange={(checked) => {
                  setFormValues(prev => ({ ...prev, includeOtherItems: checked }));
                }}
                name="includeOtherItems"
                id="includeOtherItems"
              />
              <span className="ml-2">Include Other Items</span>
            </Label>
            {formValues.includeOtherItems && (
              <div className="mt-2 space-y-2">
                <div>
                  <Label htmlFor="itemCategory">Item Category</Label>
                  <Input
                    type="text"
                    id="itemCategory"
                    name="itemCategory"
                    value={formValues.itemCategory}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="specificItem">Specific Item</Label>
                  <Input
                    type="text"
                    id="specificItem"
                    name="specificItem"
                    value={formValues.specificItem}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="otherItemDescription">Item Description</Label>
                  <Textarea
                    id="otherItemDescription"
                    name="otherItemDescription"
                    value={formValues.otherItemDescription}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="shipmentType">Shipment Type</Label>
            <Select value={formValues.shipmentType} onValueChange={(value) => setFormValues(prev => ({ ...prev, shipmentType: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select shipment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parcel">Parcel</SelectItem>
                <SelectItem value="pallet">Pallet</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formValues.shipmentType === 'parcel' && (
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                type="number"
                id="weight"
                name="weight"
                value={formValues.weight}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="paymentOption">Payment Option</Label>
            <Select value={formValues.paymentOption} onValueChange={(value) => setFormValues(prev => ({ ...prev, paymentOption: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a payment option" />
              </SelectTrigger>
              <SelectContent>
                {paymentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentOption === 'standard' && (
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formValues.paymentMethod} onValueChange={(value) => setFormValues(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentOption === 'payLater' && (
            <div>
              <Label htmlFor="payLaterMethod">Payment Terms</Label>
              <Select value={formValues.payLaterMethod} onValueChange={(value) => setFormValues(prev => ({ ...prev, payLaterMethod: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-days">30 Days</SelectItem>
                  <SelectItem value="60-days">60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingFormNew;
