
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle, MinusCircle } from 'lucide-react';
import { countries } from '@/constants/countries';
import { paymentOptions } from '@/constants/paymentOptions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const [shipmentId, setShipmentId] = useState(uuidv4());
  const [amount, setAmount] = useState(0);
  const [includeDrums, setIncludeDrums] = useState(false);
  const [includeOtherItems, setIncludeOtherItems] = useState(false);
  const [pickupCountry, setPickupCountry] = useState('England');
  const [paymentOption, setPaymentOption] = useState('standard');
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if user is not logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to book a shipment",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setShipmentId(`shp_${uuidv4()}`);
  }, [user, navigate, toast]);

  useEffect(() => {
    setIncludeDrums(Boolean(formValues.includeDrums));
    setIncludeOtherItems(Boolean(formValues.includeOtherItems));
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

  const handleCheckboxChange = (name: string, checked: boolean) => {
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

  // Validate form function
  const validateForm = () => {
    const errors = [];
    
    // Required personal information
    if (!formValues.firstName) errors.push("First Name is required");
    if (!formValues.lastName) errors.push("Last Name is required");
    if (!formValues.email) errors.push("Email is required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) errors.push("Please enter a valid email address");
    if (!formValues.phone) errors.push("Phone Number is required");
    else if (!/^\+?[0-9\s()-]{8,20}$/.test(formValues.phone)) errors.push("Please enter a valid phone number");
    
    // Required pickup information
    if (!formValues.pickupAddress) errors.push("Pickup Address is required");
    if (formValues.pickupCountry === 'England' && !formValues.pickupPostcode) errors.push("Pickup Postcode is required");
    if (formValues.pickupCountry !== 'England' && !formValues.pickupCity) errors.push("Pickup City is required");
    
    // Required recipient information
    if (!formValues.recipientName) errors.push("Recipient Name is required");
    if (!formValues.recipientPhone) errors.push("Recipient Phone is required");
    else if (!/^\+?[0-9\s()-]{8,20}$/.test(formValues.recipientPhone)) errors.push("Please enter a valid recipient phone number");
    if (!formValues.deliveryAddress) errors.push("Delivery Address is required");
    if (!formValues.deliveryCity) errors.push("Delivery City is required");

    // Validate additional delivery addresses if door to door is selected
    if (formValues.doorToDoor && formValues.additionalDeliveryAddresses.length > 0) {
      formValues.additionalDeliveryAddresses.forEach((addr, i) => {
        if (!addr.address) errors.push(`Additional address #${i+1} is missing street address`);
        if (!addr.city) errors.push(`Additional address #${i+1} is missing city`);
      });
    }
    
    // Validate drum information if includeDrums is true
    if (formValues.includeDrums) {
      if (!formValues.drumQuantity) errors.push("Drum Quantity is required");
      else {
        const qty = parseInt(formValues.drumQuantity);
        if (isNaN(qty) || qty <= 0) errors.push("Please enter a valid drum quantity");
      }
    }
    
    // Validate other item information if includeOtherItems is true
    if (formValues.includeOtherItems) {
      if (!formValues.itemCategory) errors.push("Item Category is required");
      if (!formValues.specificItem) errors.push("Specific Item is required");
      if (!formValues.otherItemDescription) errors.push("Item Description is required");
    }
    
    // Check if at least one shipment type is selected
    if (!formValues.includeDrums && !formValues.includeOtherItems) {
      errors.push("Please select at least one shipment type (Drums or Other Items)");
    }
    
    // Validate parcel weight if shipment type is parcel
    if (formValues.shipmentType === 'parcel' && !formValues.weight) {
      errors.push("Weight is required for parcel shipments");
    }
    
    // Validate payment information
    if (formValues.paymentOption === 'payLater' && !formValues.payLaterMethod) {
      errors.push("Please select payment terms for Pay Later option");
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form fields
    const errors = validateForm();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
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
    
    // Clear validation errors if form is valid
    setValidationErrors([]);
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
                className={validationErrors.includes("First Name is required") ? "border-red-500" : ""}
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
                className={validationErrors.includes("Last Name is required") ? "border-red-500" : ""}
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
                className={validationErrors.some(e => e.includes("email")) ? "border-red-500" : ""}
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
                className={validationErrors.some(e => e.includes("phone number")) ? "border-red-500" : ""}
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
                className={validationErrors.includes("Pickup Address is required") ? "border-red-500" : ""}
              />
            </div>
            <div>
              <Label htmlFor="pickupCountry">Pickup Country</Label>
              <Select 
                value={formValues.pickupCountry} 
                onValueChange={(value) => setFormValues(prev => ({ ...prev, pickupCountry: value }))}
              >
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
                className={validationErrors.includes("Pickup Postcode is required") ? "border-red-500" : ""}
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
                className={validationErrors.includes("Pickup City is required") ? "border-red-500" : ""}
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
                className={validationErrors.includes("Recipient Name is required") ? "border-red-500" : ""}
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
                className={validationErrors.some(e => e.includes("recipient phone")) ? "border-red-500" : ""}
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
                className={validationErrors.includes("Delivery Address is required") ? "border-red-500" : ""}
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
                className={validationErrors.includes("Delivery City is required") ? "border-red-500" : ""}
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
            <Label className="flex items-center space-x-2">
              <Checkbox
                checked={formValues.doorToDoor}
                onCheckedChange={(checked) => handleCheckboxChange("doorToDoor", Boolean(checked))}
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
                    className={`flex-grow ${validationErrors.some(e => e.includes(`Additional address #${index+1} is missing street address`)) ? "border-red-500" : ""}`}
                  />
                  <Input
                    type="text"
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                    className={`w-32 ${validationErrors.some(e => e.includes(`Additional address #${index+1} is missing city`)) ? "border-red-500" : ""}`}
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

          <div className={`border rounded-md p-4 ${validationErrors.some(e => e.includes("shipment type")) ? "border-red-500" : ""}`}>
            <Label className="flex items-center space-x-2">
              <Checkbox
                checked={formValues.includeDrums}
                onCheckedChange={(checked) => handleCheckboxChange("includeDrums", Boolean(checked))}
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
                  className={validationErrors.some(e => e.includes("drum")) ? "border-red-500" : ""}
                />
                <Label className="mt-2 flex items-center">
                  <Checkbox
                    checked={formValues.wantMetalSeal}
                    onCheckedChange={(checked) => handleCheckboxChange("wantMetalSeal", Boolean(checked))}
                    id="wantMetalSeal"
                  />
                  <span className="ml-2">Want Metal Coded Seals? (£5 per seal)</span>
                </Label>
              </div>
            )}
          </div>

          <div className="border rounded-md p-4">
            <Label className="flex items-center space-x-2">
              <Checkbox
                checked={formValues.includeOtherItems}
                onCheckedChange={(checked) => handleCheckboxChange("includeOtherItems", Boolean(checked))}
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
                    className={validationErrors.includes("Item Category is required") ? "border-red-500" : ""}
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
                    className={validationErrors.includes("Specific Item is required") ? "border-red-500" : ""}
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
                    className={validationErrors.includes("Item Description is required") ? "border-red-500" : ""}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="shipmentType">Shipment Type</Label>
            <Select 
              value={formValues.shipmentType} 
              onValueChange={(value) => setFormValues(prev => ({ ...prev, shipmentType: value }))}
            >
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
                className={validationErrors.includes("Weight is required for parcel shipments") ? "border-red-500" : ""}
              />
            </div>
          )}

          <div>
            <Label htmlFor="paymentOption">Payment Option</Label>
            <Select 
              value={formValues.paymentOption} 
              onValueChange={(value) => setFormValues(prev => ({ ...prev, paymentOption: value }))}
            >
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
              <Select 
                value={formValues.paymentMethod} 
                onValueChange={(value) => setFormValues(prev => ({ ...prev, paymentMethod: value }))}
              >
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
              <Select 
                value={formValues.payLaterMethod} 
                onValueChange={(value) => setFormValues(prev => ({ ...prev, payLaterMethod: value }))}
              >
                <SelectTrigger className={`w-full ${validationErrors.includes("Please select payment terms for Pay Later option") ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-days">30 Days</SelectItem>
                  <SelectItem value="60-days">60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="text-red-500 text-sm">
              <p className="font-bold">Please correct the following errors:</p>
              <ul className="list-disc pl-5 mt-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
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
