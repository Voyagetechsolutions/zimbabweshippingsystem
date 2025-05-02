import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdditionalAddress {
  id: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  city: string;
}

const BookingFormNew = ({ onSubmitComplete }: { onSubmitComplete: (data: any, shipmentId: string, amount: number) => void }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupPostcode, setPickupPostcode] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupCountry, setPickupCountry] = useState('England');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [additionalRecipientPhone, setAdditionalRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [includeDrums, setIncludeDrums] = useState(false);
  const [drumQuantity, setDrumQuantity] = useState('');
  const [wantMetalSeal, setWantMetalSeal] = useState(false);
  const [includeOtherItems, setIncludeOtherItems] = useState(false);
  const [itemCategory, setItemCategory] = useState('');
  const [specificItem, setSpecificItem] = useState('');
  const [otherItemDescription, setOtherItemDescription] = useState('');
  const [shipmentType, setShipmentType] = useState('parcel');
  const [weight, setWeight] = useState('');
  const [doorToDoor, setDoorToDoor] = useState(false);
  const [additionalDeliveryAddresses, setAdditionalDeliveryAddresses] = useState<AdditionalAddress[]>([]);
  const [paymentOption, setPaymentOption] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const newFormData = {
      firstName,
      lastName,
      email,
      phone,
      pickupAddress,
      pickupPostcode,
      pickupCity,
      pickupCountry,
      recipientName,
      recipientPhone,
      additionalRecipientPhone,
      deliveryAddress,
      deliveryCity,
      includeDrums,
      drumQuantity,
      wantMetalSeal,
      includeOtherItems,
      itemCategory,
      specificItem,
      otherItemDescription,
      shipmentType,
      weight,
      doorToDoor,
      additionalDeliveryAddresses,
      paymentOption,
      paymentMethod,
    };
    setFormData(newFormData);
  }, [
    firstName,
    lastName,
    email,
    phone,
    pickupAddress,
    pickupPostcode,
    pickupCity,
    pickupCountry,
    recipientName,
    recipientPhone,
    additionalRecipientPhone,
    deliveryAddress,
    deliveryCity,
    includeDrums,
    drumQuantity,
    wantMetalSeal,
    includeOtherItems,
    itemCategory,
    specificItem,
    otherItemDescription,
    shipmentType,
    weight,
    doorToDoor,
    additionalDeliveryAddresses,
    paymentOption,
    paymentMethod,
  ]);

  const handleAddAddress = () => {
    setAdditionalDeliveryAddresses([
      ...additionalDeliveryAddresses,
      {
        id: uuidv4(),
        recipientName: '',
        recipientPhone: '',
        address: '',
        city: '',
      },
    ]);
  };

  const handleRemoveAddress = (id: string) => {
    setAdditionalDeliveryAddresses(additionalDeliveryAddresses.filter((address) => address.id !== id));
  };

  const handleAddressChange = (id: string, field: string, value: string) => {
    setAdditionalDeliveryAddresses(
      additionalDeliveryAddresses.map((address) =>
        address.id === id ? { ...address, [field]: value } : address
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation - check required fields
    const requiredFields = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone Number',
      pickupAddress: 'Pickup Address',
      pickupPostcode: pickupCountry === 'England' ? 'Pickup Postcode' : undefined,
      pickupCity: pickupCountry !== 'England' ? 'Pickup City' : undefined,
      recipientName: 'Recipient Name',
      recipientPhone: 'Recipient Phone Number',
      deliveryAddress: 'Delivery Address',
      deliveryCity: 'Delivery City',
    };

    // Validate form based on selected options
    if (includeDrums && (!drumQuantity || parseInt(drumQuantity) < 1)) {
      toast({
        title: "Validation Error",
        description: "Please specify the number of drums",
        variant: "destructive",
      });
      return;
    }

    if (includeOtherItems && !itemCategory) {
      toast({
        title: "Validation Error",
        description: "Please select an item category",
        variant: "destructive",
      });
      return;
    }

    if (includeOtherItems && (specificItem === 'other' || !specificItem) && !otherItemDescription) {
      toast({
        title: "Validation Error", 
        description: "Please provide a description of your item",
        variant: "destructive",
      });
      return;
    }

    if (doorToDoor && additionalDeliveryAddresses.length > 0) {
      // Check if all additional addresses have required fields
      const invalidAddresses = additionalDeliveryAddresses.filter(addr => 
        !addr.address || !addr.city || !addr.recipientName || !addr.recipientPhone
      );
      
      if (invalidAddresses.length > 0) {
        toast({
          title: "Validation Error",
          description: "Please complete all additional delivery addresses",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to book a shipment",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // General form validation for required fields
    const missingFields = Object.entries(requiredFields)
      .filter(([key, label]) => label !== undefined && !formData[key as keyof typeof formData])
      .map(([_, label]) => label);

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    const shipmentId = `shp_${uuidv4()}`;
    const amount = includeDrums ? 100 : 50;
    onSubmitComplete(formData, shipmentId, amount);
  };

  const categories = [
    { value: "automotive", label: "Automotive Parts & Vehicles" },
    { value: "electronics", label: "Electronics & Appliances" },
    { value: "furniture", label: "Furniture" },
    { value: "medical", label: "Medical Equipment" },
    { value: "personal", label: "Personal Effects" },
    { value: "commercial", label: "Commercial Goods" },
    { value: "construction", label: "Construction Materials" },
    { value: "agricultural", label: "Agricultural Equipment" },
    { value: "other", label: "Other" }
  ];

  const specificItems = {
    automotive: [
      { value: "car", label: "Car" },
      { value: "truck", label: "Truck" },
      { value: "parts", label: "Vehicle Parts" },
      { value: "motorcycle", label: "Motorcycle" },
      { value: "other", label: "Other Automotive Item" }
    ],
    electronics: [
      { value: "tv", label: "Television" },
      { value: "fridge", label: "Refrigerator" },
      { value: "freezer", label: "Freezer" },
      { value: "washer", label: "Washing Machine" },
      { value: "generator", label: "Generator" },
      { value: "other", label: "Other Electronics" }
    ],
    furniture: [
      { value: "sofa", label: "Sofa/Couch" },
      { value: "bed", label: "Bed" },
      { value: "cabinet", label: "Cabinets/Wardrobes" },
      { value: "table", label: "Tables/Chairs" },
      { value: "other", label: "Other Furniture" }
    ],
    medical: [
      { value: "equipment", label: "Medical Equipment" },
      { value: "supplies", label: "Medical Supplies" },
      { value: "other", label: "Other Medical Item" }
    ],
    personal: [
      { value: "clothing", label: "Clothing" },
      { value: "books", label: "Books" },
      { value: "housewares", label: "Housewares" },
      { value: "other", label: "Other Personal Items" }
    ],
    commercial: [
      { value: "inventory", label: "Shop Inventory" },
      { value: "equipment", label: "Business Equipment" },
      { value: "other", label: "Other Commercial Goods" }
    ],
    construction: [
      { value: "tools", label: "Tools & Equipment" },
      { value: "materials", label: "Building Materials" },
      { value: "other", label: "Other Construction Items" }
    ],
    agricultural: [
      { value: "tractor", label: "Tractor" },
      { value: "tools", label: "Farming Tools" },
      { value: "equipment", label: "Farming Equipment" },
      { value: "other", label: "Other Agricultural Items" }
    ],
    other: [
      { value: "custom", label: "Custom Item (Specify in Description)" }
    ]
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Shipment Details</CardTitle>
        <CardDescription>Enter the details of your shipment</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              type="text"
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              type="text"
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              placeholder="john.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              type="tel"
              id="phone"
              placeholder="+44 7123 456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pickupAddress">Pickup Address</Label>
            <Input
              type="text"
              id="pickupAddress"
              placeholder="123 Main Street"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickupPostcode">Pickup Postcode</Label>
              <Input
                type="text"
                id="pickupPostcode"
                placeholder="NW1 0AA"
                value={pickupPostcode}
                onChange={(e) => setPickupPostcode(e.target.value)}
                disabled={pickupCountry !== 'England'}
              />
            </div>
            <div>
              <Label htmlFor="pickupCity">Pickup City</Label>
              <Input
                type="text"
                id="pickupCity"
                placeholder="London"
                value={pickupCity}
                onChange={(e) => setPickupCity(e.target.value)}
                disabled={pickupCountry === 'England'}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pickupCountry">Pickup Country</Label>
            <Select value={pickupCountry} onValueChange={setPickupCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="England">England</SelectItem>
                <SelectItem value="Scotland">Scotland</SelectItem>
                <SelectItem value="Wales">Wales</SelectItem>
                <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input
              type="text"
              id="recipientName"
              placeholder="Jane Smith"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="recipientPhone">Recipient Phone Number</Label>
            <Input
              type="tel"
              id="recipientPhone"
              placeholder="+263 777 123 456"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="additionalRecipientPhone">Additional Recipient Phone Number (Optional)</Label>
            <Input
              type="tel"
              id="additionalRecipientPhone"
              placeholder="+263 777 987 654"
              value={additionalRecipientPhone}
              onChange={(e) => setAdditionalRecipientPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="deliveryAddress">Delivery Address</Label>
            <Input
              type="text"
              id="deliveryAddress"
              placeholder="456 Elm Street"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="deliveryCity">Delivery City</Label>
            <Input
              type="text"
              id="deliveryCity"
              placeholder="Harare"
              value={deliveryCity}
              onChange={(e) => setDeliveryCity(e.target.value)}
            />
          </div>

          <div className="border rounded-md p-4">
            <div className="mb-2">
              <Label htmlFor="includeDrums" className="flex items-center space-x-2">
                <Checkbox
                  id="includeDrums"
                  checked={includeDrums}
                  onCheckedChange={(checked) => setIncludeDrums(!!checked)}
                />
                <span>Include Drums?</span>
              </Label>
            </div>
            {includeDrums && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="drumQuantity">Number of Drums</Label>
                  <Input
                    type="number"
                    id="drumQuantity"
                    placeholder="Enter quantity"
                    value={drumQuantity}
                    onChange={(e) => setDrumQuantity(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="wantMetalSeal" className="flex items-center space-x-2">
                    <Checkbox
                      id="wantMetalSeal"
                      checked={wantMetalSeal}
                      onCheckedChange={(checked) => setWantMetalSeal(!!checked)}
                    />
                    <span>Want Metal Seal? (£5 per drum)</span>
                  </Label>
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-md p-4">
            <div className="mb-2">
              <Label htmlFor="includeOtherItems" className="flex items-center space-x-2">
                <Checkbox
                  id="includeOtherItems"
                  checked={includeOtherItems}
                  onCheckedChange={(checked) => setIncludeOtherItems(!!checked)}
                />
                <span>Include Other Items?</span>
              </Label>
            </div>
            {includeOtherItems && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="itemCategory">Item Category</Label>
                  <Select value={itemCategory} onValueChange={setItemCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {itemCategory && (
                  <div>
                    <Label htmlFor="specificItem">Specific Item</Label>
                    <Select value={specificItem} onValueChange={setSpecificItem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific item" />
                      </SelectTrigger>
                      <SelectContent>
                        {(specificItems as any)[itemCategory]?.map((item: any) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {specificItem === 'other' && (
                  <div>
                    <Label htmlFor="otherItemDescription">Item Description</Label>
                    <Textarea
                      id="otherItemDescription"
                      placeholder="Describe the item"
                      value={otherItemDescription}
                      onChange={(e) => setOtherItemDescription(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="shipmentType">Shipment Type</Label>
            <Select value={shipmentType} onValueChange={setShipmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select shipment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parcel">Parcel</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shipmentType === 'parcel' && (
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                type="number"
                id="weight"
                placeholder="Enter weight in kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          )}

          <div className="border rounded-md p-4">
            <Label htmlFor="doorToDoor" className="flex items-center space-x-2">
              <Switch
                id="doorToDoor"
                checked={doorToDoor}
                onCheckedChange={(checked) => setDoorToDoor(checked)}
              />
              <span>Door to Door Delivery? (£25 per address)</span>
            </Label>
            {doorToDoor && (
              <div>
                {additionalDeliveryAddresses.map((address, index) => (
                  <div key={address.id} className="grid gap-2 border rounded-md p-4 mt-4">
                    <h4 className="text-sm font-semibold">Address {index + 1}</h4>
                    <div>
                      <Label htmlFor={`recipientName-${address.id}`}>Recipient Name</Label>
                      <Input
                        type="text"
                        id={`recipientName-${address.id}`}
                        placeholder="Recipient Name"
                        value={address.recipientName}
                        onChange={(e) => handleAddressChange(address.id, 'recipientName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`recipientPhone-${address.id}`}>Recipient Phone</Label>
                      <Input
                        type="tel"
                        id={`recipientPhone-${address.id}`}
                        placeholder="Recipient Phone"
                        value={address.recipientPhone}
                        onChange={(e) => handleAddressChange(address.id, 'recipientPhone', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`address-${address.id}`}>Address</Label>
                      <Input
                        type="text"
                        id={`address-${address.id}`}
                        placeholder="Address"
                        value={address.address}
                        onChange={(e) => handleAddressChange(address.id, 'address', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`city-${address.id}`}>City</Label>
                      <Input
                        type="text"
                        id={`city-${address.id}`}
                        placeholder="City"
                        value={address.city}
                        onChange={(e) => handleAddressChange(address.id, 'city', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveAddress(address.id)}
                    >
                      <MinusCircle className="h-4 w-4 mr-2" />
                      Remove Address
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAddress}
                  className="mt-4"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Additional Address
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="paymentOption">Payment Option</Label>
            <Select value={paymentOption} onValueChange={setPaymentOption}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="paypal">PayPal (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit">Submit</Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-gray-500">
          By submitting this form, you agree to our <a href="/terms" className="text-blue-500">Terms and Conditions</a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default BookingFormNew;
