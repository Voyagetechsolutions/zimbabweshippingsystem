import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateUniqueId } from '@/utils/generators';
import { supabase } from '@/integrations/supabase/client';

interface BookingFormProps {
  onSubmitComplete: (data: any, shipmentId: string, amount: number) => void;
}

const steps = [
  'Pickup Details',
  'Delivery Details',
  'Shipment Details',
  'Additional Services',
  'Payment Options'
];

const BookingFormNew: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [shipmentId, setShipmentId] = useState(generateUniqueId('shp_'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [additionalDeliveryAddresses, setAdditionalDeliveryAddresses] = useState([]);
  const [weight, setWeight] = useState('');
  const [amount, setAmount] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const createShipmentRecord = async () => {
      try {
        const { data, error } = await supabase
          .from('shipments')
          .insert({
            id: shipmentId.substring(4),
            tracking_number: generateUniqueId('ZIM-'),
            status: 'pending',
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating shipment record:', error);
          toast({
            title: 'Error',
            description: 'Failed to create shipment record. Please try again.',
            variant: 'destructive',
          });
        } else {
          console.log('Shipment record created successfully:', data);
        }
      } catch (error) {
        console.error('Error creating shipment record:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    };

    createShipmentRecord();
  }, [shipmentId, toast]);

  useEffect(() => {
    if (weight && formData.shipmentType === 'parcel') {
      const parsedWeight = parseFloat(weight);
      if (!isNaN(parsedWeight)) {
        let calculatedAmount = 50;
        if (parsedWeight > 10) {
          calculatedAmount += (parsedWeight - 10) * 5;
        }
        setAmount(calculatedAmount);
      } else {
        setAmount(0);
      }
    } else {
      setAmount(0);
    }
  }, [weight, formData.shipmentType]);

  const validateStep = (currentStep, formData) => {
    const errors = {};

    if (currentStep === 0) {
      if (!formData.firstName?.trim()) errors.firstName = "First name is required";
      if (!formData.lastName?.trim()) errors.lastName = "Last name is required";
      if (!formData.email?.trim()) errors.email = "Email address is required";
      if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
      if (!formData.phone?.trim()) errors.phone = "Phone number is required";
      if (!formData.pickupAddress?.trim()) errors.pickupAddress = "Pickup address is required";
      if (formData.pickupCountry === "England" && !formData.pickupPostcode?.trim()) {
        errors.pickupPostcode = "Postcode is required for England";
      }
      if (formData.pickupCountry !== "England" && !formData.pickupCity?.trim()) {
        errors.pickupCity = "City is required";
      }
    } else if (currentStep === 1) {
      if (!formData.recipientName?.trim()) errors.recipientName = "Recipient name is required";
      if (!formData.recipientPhone?.trim()) errors.recipientPhone = "Recipient phone is required";
      if (!formData.deliveryAddress?.trim()) errors.deliveryAddress = "Delivery address is required";
      if (!formData.deliveryCity?.trim()) errors.deliveryCity = "Delivery city is required";
    } else if (currentStep === 2) {
      if (formData.includeDrums) {
        if (!formData.drumQuantity || parseInt(formData.drumQuantity) < 1) {
          errors.drumQuantity = "Please specify the number of drums";
        }
      }

      if (formData.includeOtherItems) {
        if (!formData.itemCategory) errors.itemCategory = "Please select a category";
        if (!formData.specificItem?.trim()) errors.specificItem = "Please specify the item";
        if (!formData.otherItemDescription?.trim()) errors.otherItemDescription = "Please provide a description";
      }

      if (!formData.includeDrums && !formData.includeOtherItems) {
        errors.generalShipment = "Please select at least one type of shipment";
      }
    }

    return errors;
  };

  const isStepValid = (errors) => {
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCheckboxChange = (name) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNext = () => {
    const errors = validateStep(currentStep, formData);

    if (isStepValid(errors)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    } else {
      setValidationErrors(errors);
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const addDeliveryAddress = () => {
    setAdditionalDeliveryAddresses([
      ...additionalDeliveryAddresses,
      { id: generateUniqueId('addr_'), address: '', city: '' }
    ]);
  };

  const updateDeliveryAddress = (id, field, value) => {
    const updatedAddresses = additionalDeliveryAddresses.map(addr =>
      addr.id === id ? { ...addr, [field]: value } : addr
    );
    setAdditionalDeliveryAddresses(updatedAddresses);
    setFormData({ ...formData, additionalDeliveryAddresses: updatedAddresses });
  };

  const removeDeliveryAddress = (id) => {
    const updatedAddresses = additionalDeliveryAddresses.filter(addr => addr.id !== id);
    setAdditionalDeliveryAddresses(updatedAddresses);
    setFormData({ ...formData, additionalDeliveryAddresses: updatedAddresses });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateStep(currentStep, formData);
    if (!isStepValid(errors)) {
      setValidationErrors(errors);
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalFormData = {
        ...formData,
        additionalDeliveryAddresses,
      };

      onSubmitComplete(finalFormData, shipmentId, amount);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit the form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalAmount = amount;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-4">
        {steps[currentStep]}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className={validationErrors.firstName ? "text-destructive" : ""}>First Name*</Label>
              <Input
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={validationErrors.firstName ? "border-destructive" : ""}
                required
              />
              {validationErrors.firstName && (
                <p className="text-destructive text-sm">{validationErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className={validationErrors.lastName ? "text-destructive" : ""}>Last Name*</Label>
              <Input
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={validationErrors.lastName ? "border-destructive" : ""}
                required
              />
              {validationErrors.lastName && (
                <p className="text-destructive text-sm">{validationErrors.lastName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={validationErrors.email ? "text-destructive" : ""}>Email*</Label>
              <Input
                type="email"
                id="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={validationErrors.email ? "border-destructive" : ""}
                required
              />
              {validationErrors.email && (
                <p className="text-destructive text-sm">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={validationErrors.phone ? "text-destructive" : ""}>Phone Number*</Label>
              <Input
                type="tel"
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={validationErrors.phone ? "border-destructive" : ""}
                required
              />
              {validationErrors.phone && (
                <p className="text-destructive text-sm">{validationErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupAddress" className={validationErrors.pickupAddress ? "text-destructive" : ""}>Pickup Address*</Label>
              <Input
                id="pickupAddress"
                value={formData.pickupAddress || ''}
                onChange={(e) => handleInputChange('pickupAddress', e.target.value)}
                className={validationErrors.pickupAddress ? "border-destructive" : ""}
                required
              />
              {validationErrors.pickupAddress && (
                <p className="text-destructive text-sm">{validationErrors.pickupAddress}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupCountry">Pickup Country</Label>
              <Select
                value={formData.pickupCountry || 'England'}
                onValueChange={(value) => handleInputChange('pickupCountry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="England">England</SelectItem>
                  <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                  <SelectItem value="South Africa">South Africa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.pickupCountry === 'England' ? (
              <div className="space-y-2">
                <Label htmlFor="pickupPostcode" className={validationErrors.pickupPostcode ? "text-destructive" : ""}>Pickup Postcode*</Label>
                <Input
                  id="pickupPostcode"
                  value={formData.pickupPostcode || ''}
                  onChange={(e) => handleInputChange('pickupPostcode', e.target.value)}
                  className={validationErrors.pickupPostcode ? "border-destructive" : ""}
                  required
                />
                {validationErrors.pickupPostcode && (
                  <p className="text-destructive text-sm">{validationErrors.pickupPostcode}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pickupCity" className={validationErrors.pickupCity ? "text-destructive" : ""}>Pickup City*</Label>
                <Input
                  id="pickupCity"
                  value={formData.pickupCity || ''}
                  onChange={(e) => handleInputChange('pickupCity', e.target.value)}
                  className={validationErrors.pickupCity ? "border-destructive" : ""}
                  required
                />
                {validationErrors.pickupCity && (
                  <p className="text-destructive text-sm">{validationErrors.pickupCity}</p>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName" className={validationErrors.recipientName ? "text-destructive" : ""}>Recipient Name*</Label>
              <Input
                id="recipientName"
                value={formData.recipientName || ''}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                className={validationErrors.recipientName ? "border-destructive" : ""}
                required
              />
              {validationErrors.recipientName && (
                <p className="text-destructive text-sm">{validationErrors.recipientName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientPhone" className={validationErrors.recipientPhone ? "text-destructive" : ""}>Recipient Phone*</Label>
              <Input
                type="tel"
                id="recipientPhone"
                value={formData.recipientPhone || ''}
                onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
                className={validationErrors.recipientPhone ? "border-destructive" : ""}
                required
              />
              {validationErrors.recipientPhone && (
                <p className="text-destructive text-sm">{validationErrors.recipientPhone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalRecipientPhone">Additional Recipient Phone</Label>
              <Input
                type="tel"
                id="additionalRecipientPhone"
                value={formData.additionalRecipientPhone || ''}
                onChange={(e) => handleInputChange('additionalRecipientPhone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className={validationErrors.deliveryAddress ? "text-destructive" : ""}>Delivery Address*</Label>
              <Input
                id="deliveryAddress"
                value={formData.deliveryAddress || ''}
                onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                className={validationErrors.deliveryAddress ? "border-destructive" : ""}
                required
              />
              {validationErrors.deliveryAddress && (
                <p className="text-destructive text-sm">{validationErrors.deliveryAddress}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryCity" className={validationErrors.deliveryCity ? "text-destructive" : ""}>Delivery City*</Label>
              <Input
                id="deliveryCity"
                value={formData.deliveryCity || ''}
                onChange={(e) => handleInputChange('deliveryCity', e.target.value)}
                className={validationErrors.deliveryCity ? "border-destructive" : ""}
                required
              />
              {validationErrors.deliveryCity && (
                <p className="text-destructive text-sm">{validationErrors.deliveryCity}</p>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shipment Type*</Label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDrums"
                    checked={formData.includeDrums || false}
                    onCheckedChange={() => {
                      handleCheckboxChange('includeDrums');
                      if (validationErrors.generalShipment) {
                        setValidationErrors(prev => {
                          const { generalShipment, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                  />
                  <Label htmlFor="includeDrums">Include Drums</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeOtherItems"
                    checked={formData.includeOtherItems || false}
                    onCheckedChange={() => {
                      handleCheckboxChange('includeOtherItems');
                      if (validationErrors.generalShipment) {
                        setValidationErrors(prev => {
                          const { generalShipment, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                  />
                  <Label htmlFor="includeOtherItems">Include Other Items</Label>
                </div>
              </div>
              {validationErrors.generalShipment && (
                <p className="text-destructive text-sm">{validationErrors.generalShipment}</p>
              )}
            </div>

            {formData.includeDrums && (
              <div className="space-y-2">
                <Label htmlFor="drumQuantity" className={validationErrors.drumQuantity ? "text-destructive" : ""}>Number of Drums*</Label>
                <Input
                  type="number"
                  id="drumQuantity"
                  value={formData.drumQuantity || ''}
                  onChange={(e) => handleInputChange('drumQuantity', e.target.value)}
                  className={validationErrors.drumQuantity ? "border-destructive" : ""}
                  required={formData.includeDrums}
                />
                {validationErrors.drumQuantity && (
                  <p className="text-destructive text-sm">{validationErrors.drumQuantity}</p>
                )}
              </div>
            )}

            {formData.includeOtherItems && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCategory" className={validationErrors.itemCategory ? "text-destructive" : ""}>Item Category*</Label>
                  <Select
                    value={formData.itemCategory || ''}
                    onValueChange={(value) => {
                      handleInputChange('itemCategory', value);
                      if (validationErrors.itemCategory) {
                        setValidationErrors(prev => {
                          const { itemCategory, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={validationErrors.itemCategory ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="appliances">Appliances</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="vehicles">Vehicle Parts</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.itemCategory && (
                    <p className="text-destructive text-sm">{validationErrors.itemCategory}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specificItem" className={validationErrors.specificItem ? "text-destructive" : ""}>Specific Item*</Label>
                  <Input
                    id="specificItem"
                    value={formData.specificItem || ''}
                    onChange={(e) => handleInputChange('specificItem', e.target.value)}
                    className={validationErrors.specificItem ? "border-destructive" : ""}
                    required={formData.includeOtherItems}
                  />
                  {validationErrors.specificItem && (
                    <p className="text-destructive text-sm">{validationErrors.specificItem}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherItemDescription" className={validationErrors.otherItemDescription ? "text-destructive" : ""}>Item Description*</Label>
                  <Textarea
                    id="otherItemDescription"
                    value={formData.otherItemDescription || ''}
                    onChange={(e) => handleInputChange('otherItemDescription', e.target.value)}
                    className={validationErrors.otherItemDescription ? "border-destructive" : ""}
                    required={formData.includeOtherItems}
                  />
                  {validationErrors.otherItemDescription && (
                    <p className="text-destructive text-sm">{validationErrors.otherItemDescription}</p>
                  )}
                </div>
              </div>
            )}

            {formData.includeOtherItems && formData.itemCategory === 'parcel' && (
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  type="number"
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight in kg"
                />
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            {formData.includeDrums && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wantMetalSeal"
                  checked={formData.wantMetalSeal || false}
                  onCheckedChange={() => handleCheckboxChange('wantMetalSeal')}
                />
                <Label htmlFor="wantMetalSeal">Want Metal Coded Seals (£5 per drum)</Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="doorToDoor"
                checked={formData.doorToDoor || false}
                onCheckedChange={() => handleCheckboxChange('doorToDoor')}
              />
              <Label htmlFor="doorToDoor">Door-to-door delivery (£25 per address)</Label>
            </div>

            {formData.doorToDoor && (
              <div className="space-y-4">
                {additionalDeliveryAddresses.map(addr => (
                  <div key={addr.id} className="border rounded-md p-4 space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor={`address-${addr.id}`}>Address</Label>
                      <Input
                        type="text"
                        id={`address-${addr.id}`}
                        value={addr.address}
                        onChange={(e) => updateDeliveryAddress(addr.id, 'address', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`city-${addr.id}`}>City</Label>
                      <Input
                        type="text"
                        id={`city-${addr.id}`}
                        value={addr.city}
                        onChange={(e) => updateDeliveryAddress(addr.id, 'city', e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeDeliveryAddress(addr.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addDeliveryAddress}>
                  Add Additional Delivery Address
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentOption">Payment Option</Label>
              <Select
                value={formData.paymentOption || 'standard'}
                onValueChange={(value) => handleInputChange('paymentOption', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a payment option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="cashOnCollection">Cash on Collection</SelectItem>
                  <SelectItem value="payOnArrival">Pay on Arrival</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod || 'card'}
                onValueChange={(value) => handleInputChange('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="bg-zim-green hover:bg-zim-green/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Book Shipment'
              )}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default BookingFormNew;
