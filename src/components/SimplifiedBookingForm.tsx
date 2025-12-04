import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Package, Truck, User, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  cashPayment: boolean;
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
    cashPayment: false,
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const calculateTotal = () => {
    let total = 0;
    if (formData.includeDrums && formData.drumQuantity > 0) {
      const drumPrice = getDrumPrice(formData.drumQuantity);
      total = formData.drumQuantity * drumPrice;
      
      // Add metal seal cost
      if (formData.wantMetalSeal) {
        total += formData.drumQuantity * 5;
      }
      
      // Apply cash payment discount
      if (formData.cashPayment) {
        total -= formData.drumQuantity * 20;
      }
    }
    return total;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Generate tracking number
      const trackingNumber = `ZSN${Date.now().toString().slice(-8)}`;
      
      // Build notes with add-ons and custom items
      let notes = [];
      if (formData.wantMetalSeal) notes.push('Metal Coded Seal requested');
      if (formData.cashPayment) notes.push('Cash payment (discount applied)');
      if (formData.includeBoxes) notes.push(`Boxes & Other Items: ${formData.boxesDescription}`);
      
      // Create shipment
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          tracking_number: trackingNumber,
          user_id: null, // Guest booking
          sender_name: `${formData.senderFirstName} ${formData.senderLastName}`,
          sender_email: formData.senderEmail,
          sender_phone: formData.senderPhone,
          sender_address: `${formData.pickupAddress}, ${formData.pickupCity}, ${formData.pickupPostcode}`,
          recipient_name: formData.receiverName,
          recipient_phone: formData.receiverPhone,
          recipient_address: `${formData.deliveryAddress}, ${formData.deliveryCity}, Zimbabwe`,
          shipment_type: formData.includeDrums ? 'drum' : 'other',
          quantity: formData.drumQuantity || 1,
          total_amount: calculateTotal(),
          status: 'pending',
          payment_status: 'pending',
          notes: notes.length > 0 ? notes.join(' | ') : null,
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      toast({
        title: 'Booking Submitted! 🎉',
        description: `Your tracking number is ${trackingNumber}. We'll contact you shortly to confirm collection.`,
      });

      // Reset form
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
        cashPayment: false,
      });
      
      setCurrentStep(1);
      
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
        <span className="text-sm font-medium text-gray-700">Step {currentStep} of 4</span>
        <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-zim-green h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 4) * 100}%` }}
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
            <p className="text-xs text-gray-500 mt-1">Just the area code is fine</p>
          </div>
        </div>
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
          <div className={`border-2 rounded-lg p-5 transition-all ${formData.includeDrums ? 'border-zim-green bg-green-50' : 'border-gray-200 hover:border-zim-green'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeDrums}
                onChange={(e) => updateField('includeDrums', e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Drums (200-220 L)</div>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
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
                      <h4 className="font-medium text-sm text-gray-700">Add-on Services</h4>
                      
                      {/* Metal Seal */}
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.wantMetalSeal}
                          onChange={(e) => updateField('wantMetalSeal', e.target.checked)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Metal Coded Seal</div>
                          <div className="text-xs text-gray-600">Secure coded seals for drums</div>
                          <div className="text-sm font-semibold text-zim-green mt-1">+£5/drum</div>
                        </div>
                      </label>

                      {/* Cash Payment Discount */}
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.cashPayment}
                          onChange={(e) => updateField('cashPayment', e.target.checked)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Cash Payment Discount</div>
                          <div className="text-xs text-gray-600">Save when you pay with cash</div>
                          <div className="text-sm font-semibold text-green-600 mt-1">-£20/drum</div>
                        </div>
                      </label>

                      {/* Included Services */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">✓ Included Services</div>
                        <div className="space-y-1 text-xs text-gray-600">
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
          <div className={`border-2 rounded-lg p-5 transition-all ${formData.includeBoxes ? 'border-zim-yellow bg-yellow-50' : 'border-gray-200 hover:border-zim-yellow'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeBoxes}
                onChange={(e) => updateField('includeBoxes', e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Boxes & Other Items</div>
                <div className="text-sm text-gray-600 mt-1">We'll give you a custom quote</div>
                
                {formData.includeBoxes && (
                  <div className="mt-4">
                    <Label htmlFor="boxesDesc" className="text-base">What are you sending?</Label>
                    <textarea
                      id="boxesDesc"
                      placeholder="e.g., 3 boxes of clothes, 1 suitcase, books"
                      value={formData.boxesDescription}
                      onChange={(e) => updateField('boxesDescription', e.target.value)}
                      className="w-full mt-2 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-zim-yellow focus:border-transparent min-h-[100px]"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Describe what you're shipping and we'll get back to you with a custom price
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Multiple Drop-off Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
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
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p><strong>{formData.senderFirstName} {formData.senderLastName}</strong></p>
            <p>{formData.senderEmail}</p>
            <p>{formData.senderPhone}</p>
            <p className="text-gray-600">{formData.pickupAddress}, {formData.pickupCity}, {formData.pickupPostcode}</p>
          </div>
        </div>

        {/* Receiver */}
        <div>
          <h3 className="font-medium mb-2">Delivery Details</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p><strong>{formData.receiverName}</strong></p>
            <p>{formData.receiverPhone}</p>
            <p className="text-gray-600">{formData.deliveryAddress}, {formData.deliveryCity}, Zimbabwe</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <h3 className="font-medium mb-2">Shipment Items</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
            {formData.includeDrums && formData.drumQuantity > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{formData.drumQuantity} x Drum (200-220 L)</span>
                  <span className="font-medium">£{formData.drumQuantity * getDrumPrice(formData.drumQuantity)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  @ £{getDrumPrice(formData.drumQuantity)} per drum
                </div>
                
                {/* Add-ons */}
                {formData.wantMetalSeal && (
                  <div className="flex justify-between text-gray-700 border-t pt-2">
                    <span>Metal Coded Seal ({formData.drumQuantity} x £5)</span>
                    <span>+£{formData.drumQuantity * 5}</span>
                  </div>
                )}
                {formData.cashPayment && (
                  <div className="flex justify-between text-green-700 border-t pt-2">
                    <span>Cash Payment Discount ({formData.drumQuantity} x £20)</span>
                    <span>-£{formData.drumQuantity * 20}</span>
                  </div>
                )}
                
                {/* Included Services */}
                <div className="border-t pt-2 text-xs text-gray-500">
                  ✓ Insurance & Tracking included
                </div>
              </div>
            )}
            
            {formData.includeBoxes && (
              <div className={formData.includeDrums ? 'border-t pt-3' : ''}>
                <p className="font-medium text-gray-700">Boxes & Other Items:</p>
                <p className="text-gray-600 mt-1">{formData.boxesDescription}</p>
                <p className="text-xs italic mt-2 text-blue-600">Custom quote will be provided</p>
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        {formData.includeDrums && formData.drumQuantity > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-zim-green">£{calculateTotal()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.includeBoxes && '* Drums total only. Custom quote for other items will be sent separately.'}
              {!formData.includeBoxes && 'Final amount for drums'}
            </p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>Next steps:</strong> We'll contact you within 24 hours to confirm collection time and payment details.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {renderProgressBar()}

      <div className="mb-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
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

        {currentStep < 4 ? (
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
