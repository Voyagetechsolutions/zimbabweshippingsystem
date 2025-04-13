import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PoundSterling, TruckIcon, Package, Calendar, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const formSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  pickupAddress: z.string().min(5, { message: "Please enter a valid address" }),
  pickupPostcode: z.string().min(5, { message: "Please enter a valid postcode" }),
  recipientName: z.string().min(2, { message: "Recipient name must be at least 2 characters" }),
  recipientPhone: z.string().min(10, { message: "Please enter a valid phone number" }),
  deliveryAddress: z.string().min(5, { message: "Please enter a valid address" }),
  deliveryCity: z.string().min(2, { message: "Please enter a valid city" }),
  shipmentType: z.enum(["drum", "parcel", "custom"]),
  drumQuantity: z.string().optional(),
  weight: z.string().optional(),
  itemCategory: z.string().optional(),
  itemDescription: z.string().optional(),
  doorToDoor: z.boolean().default(false),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
  paymentMethod: z.enum(["cash-collection", "30-day", "goods-arriving"]),
  paymentType: z.enum(["cash", "bank-transfer", "direct-debit"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

enum BookingStep {
  SENDER_DETAILS = 0,
  RECIPIENT_DETAILS = 1,
  SHIPMENT_DETAILS = 2,
  PAYMENT_METHOD = 3,
  REVIEW = 4
}

interface BookingFormProps {
  onSubmitComplete: (data: FormValues, shipmentId: string, amount: number) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.SENDER_DETAILS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [baseShipmentCost, setBaseShipmentCost] = useState(0);
  const [additionalCost, setAdditionalCost] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: user?.email || "",
      phone: "",
      pickupAddress: "",
      pickupPostcode: "",
      recipientName: "",
      recipientPhone: "",
      deliveryAddress: "",
      deliveryCity: "",
      shipmentType: "drum",
      drumQuantity: "1",
      weight: "",
      itemCategory: "",
      itemDescription: "",
      doorToDoor: false,
      termsAccepted: false,
      paymentMethod: "cash-collection",
      paymentType: "cash",
    }
  });

  const { watch, setValue } = form;
  const shipmentType = watch("shipmentType");
  const drumQuantity = watch("drumQuantity");
  const weight = watch("weight");
  const doorToDoor = watch("doorToDoor");
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          
          if (data) {
            if (data.full_name) {
              const nameParts = data.full_name.split(' ');
              setValue('firstName', nameParts[0] || '');
              setValue('lastName', nameParts.slice(1).join(' ') || '');
            }
            
            if (data.phone_number) setValue('phone', data.phone_number);
            if (data.address) setValue('pickupAddress', data.address);
            if (data.postcode) setValue('pickupPostcode', data.postcode);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [user, setValue]);

  useEffect(() => {
    const calculateCost = () => {
      let cost = 0;
      
      if (shipmentType === "drum") {
        cost = parseInt(drumQuantity || "1") * 100;
        
        if (paymentMethod === "cash-collection") {
          cost = cost * 0.9;
        }
      } else if (shipmentType === "parcel") {
        const weightValue = parseFloat(weight || "0");
        cost = Math.max(weightValue * 15, 20);
      }
      
      setBaseShipmentCost(cost);
      
      const doorToDoorCost = doorToDoor ? 25 : 0;
      
      let totalBeforePaymentMethod = cost + doorToDoorCost;
      
      totalBeforePaymentMethod += 5;
      
      let additionalPaymentCost = 0;
      if (paymentMethod === "goods-arriving") {
        additionalPaymentCost = totalBeforePaymentMethod * 0.2;
      }
      
      setAdditionalCost(additionalPaymentCost);
      setCalculatedCost(totalBeforePaymentMethod + additionalPaymentCost);
    };
    
    calculateCost();
  }, [shipmentType, drumQuantity, weight, doorToDoor, paymentMethod]);

  const handleNext = async () => {
    const currentFields = getFieldsForCurrentStep();
    
    const result = await form.trigger(currentFields as any);
    if (!result) {
      return;
    }
    
    if (currentStep < BookingStep.REVIEW) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getFieldsForCurrentStep = () => {
    switch (currentStep) {
      case BookingStep.SENDER_DETAILS:
        return ["firstName", "lastName", "email", "phone", "pickupAddress", "pickupPostcode"];
      case BookingStep.RECIPIENT_DETAILS:
        return ["recipientName", "recipientPhone", "deliveryAddress", "deliveryCity"];
      case BookingStep.SHIPMENT_DETAILS:
        const commonFields = ["shipmentType", "doorToDoor"];
        if (shipmentType === "drum") {
          return [...commonFields, "drumQuantity"];
        } else if (shipmentType === "parcel") {
          return [...commonFields, "weight"];
        } else if (shipmentType === "custom") {
          return [...commonFields, "itemCategory", "itemDescription"];
        }
        return commonFields;
      case BookingStep.PAYMENT_METHOD:
        const paymentFields = ["paymentMethod"];
        if (paymentMethod === "30-day") {
          return [...paymentFields, "paymentType"];
        }
        return paymentFields;
      case BookingStep.REVIEW:
        return ["termsAccepted"];
      default:
        return [];
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          origin: `${data.pickupAddress}, ${data.pickupPostcode}`,
          destination: `${data.deliveryAddress}, ${data.deliveryCity}, Zimbabwe`,
          status: 'booked',
          metadata: {
            shipment_type: data.shipmentType,
            quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity || "1") : null,
            door_to_door: data.doorToDoor,
            sender_name: `${data.firstName} ${data.lastName}`,
            sender_email: data.email,
            sender_phone: data.phone,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            item_category: data.shipmentType === 'custom' ? data.itemCategory : null,
            item_description: data.shipmentType === 'custom' ? data.itemDescription : null,
            payment_method: data.paymentMethod,
            payment_type: data.paymentMethod === '30-day' ? data.paymentType : null,
          },
          weight: data.shipmentType === 'parcel' ? parseFloat(data.weight || "0") : null,
          tracking_number: `ZIM-${Math.floor(100000 + Math.random() * 900000)}`,
          user_id: user?.id || null,
        })
        .select()
        .single();
      
      if (shipmentError) throw shipmentError;
      
      onSubmitComplete(data, shipmentData.id, calculatedCost);
      
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create shipment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => {
    const steps = [
      { name: 'Sender Details', icon: <PoundSterling className="w-5 h-5" /> },
      { name: 'Recipient Details', icon: <TruckIcon className="w-5 h-5" /> },
      { name: 'Shipment Details', icon: <Package className="w-5 h-5" /> },
      { name: 'Payment Method', icon: <PoundSterling className="w-5 h-5" /> },
      { name: 'Review', icon: <Info className="w-5 h-5" /> },
    ];

    return (
      <div className="mb-8">
        <div className="hidden md:flex items-center">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div 
                className={cn(
                  "flex flex-col items-center", 
                  index <= currentStep ? "text-zim-green" : "text-gray-400"
                )}
              >
                <div 
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2",
                    index <= currentStep ? "border-zim-green bg-zim-green/10" : "border-gray-300"
                  )}
                >
                  {step.icon}
                </div>
                <span className="text-xs mt-1">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    index < currentStep ? "bg-zim-green" : "bg-gray-300"
                  )}
                ></div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium">
              {steps[currentStep].name}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-zim-green h-2 rounded-full" 
              style={{ width: `${(currentStep + 1) / steps.length * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case BookingStep.SENDER_DETAILS:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Sender Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pickupAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Address*</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pickupPostcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postcode*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your postcode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      
      case BookingStep.RECIPIENT_DETAILS:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recipient Details</h2>
            
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter recipient's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Phone Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter recipient's phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address in Zimbabwe*</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter the delivery address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deliveryCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City in Zimbabwe*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the city" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      
      case BookingStep.SHIPMENT_DETAILS:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Shipment Details</h2>
            
            <FormField
              control={form.control}
              name="shipmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are you shipping?*</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "drum") {
                          setValue("weight", "");
                          setValue("itemCategory", "");
                          setValue("itemDescription", "");
                        } else if (value === "parcel") {
                          setValue("drumQuantity", "");
                          setValue("itemCategory", "");
                          setValue("itemDescription", "");
                        } else if (value === "custom") {
                          setValue("drumQuantity", "");
                          setValue("weight", "");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drum">Drum (200L-220L)</SelectItem>
                        <SelectItem value="parcel">Other Items</SelectItem>
                        <SelectItem value="custom">Custom Item (Request Quote)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {shipmentType === "drum" ? "Send multiple items in our 200L drums" :
                     shipmentType === "parcel" ? "Ship individual items by weight" : 
                     "Request a custom quote for special items"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {shipmentType === "drum" && (
              <FormField
                control={form.control}
                name="drumQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Drums*</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || "1"} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select quantity" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'drum' : 'drums'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Each drum has a capacity of 200L-220L
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {shipmentType === "parcel" && (
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)*</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter weight in kg" 
                        min="1"
                        step="0.1"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum charge applies for items under 1.5kg
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {shipmentType === "custom" && (
              <>
                <FormField
                  control={form.control}
                  name="itemCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Category*</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value || ""} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="furniture">Furniture</SelectItem>
                            <SelectItem value="appliance">Appliance</SelectItem>
                            <SelectItem value="vehicle">Vehicle or Parts</SelectItem>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="medical">Medical Equipment</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="itemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Description*</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please describe the item(s) in detail including dimensions and weight if known" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The more details you provide, the more accurate our quote will be
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <FormField
              control={form.control}
              name="doorToDoor"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Add Door-to-Door Delivery in Zimbabwe</FormLabel>
                    <FormDescription>
                      We'll deliver directly to the recipient's address for an additional £25
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        );
      
      case BookingStep.PAYMENT_METHOD:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Payment Method</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Payment Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Select your preferred payment method. Different options have different terms and may affect the total cost.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Select Payment Method*</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div 
                        className={cn(
                          "flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer",
                          field.value === "cash-collection" ? "border-zim-green bg-zim-green/5" : "border-gray-200"
                        )}
                        onClick={() => field.onChange("cash-collection")}
                      >
                        <div className="flex items-center h-5">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            field.value === "cash-collection" ? "border-zim-green" : "border-gray-400"
                          )}>
                            {field.value === "cash-collection" && <div className="w-3 h-3 rounded-full bg-zim-green" />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-base font-medium">Cash on Collection</span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              10% Discount
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Pay with cash when we collect your items. Special discount for drum shipments!
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={cn(
                          "flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer",
                          field.value === "30-day" ? "border-zim-green bg-zim-green/5" : "border-gray-200"
                        )}
                        onClick={() => field.onChange("30-day")}
                      >
                        <div className="flex items-center h-5">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            field.value === "30-day" ? "border-zim-green" : "border-gray-400"
                          )}>
                            {field.value === "30-day" && <div className="w-3 h-3 rounded-full bg-zim-green" />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-base font-medium">Pay Later (30 Days)</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Pay within 30 days of collection with your preferred payment method
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={cn(
                          "flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer",
                          field.value === "goods-arriving" ? "border-zim-green bg-zim-green/5" : "border-gray-200"
                        )}
                        onClick={() => field.onChange("goods-arriving")}
                      >
                        <div className="flex items-center h-5">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            field.value === "goods-arriving" ? "border-zim-green" : "border-gray-400"
                          )}>
                            {field.value === "goods-arriving" && <div className="w-3 h-3 rounded-full bg-zim-green" />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-base font-medium">Pay on Goods Arriving</span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              +20% Fee
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Pay when your goods arrive in Zimbabwe. This option includes a 20% premium.
                          </div>
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {paymentMethod === "30-day" && (
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type for 30-Day Option*</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="direct-debit">Direct Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      How you would like to pay within the 30-day period
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Card className="mt-6">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Payment Summary</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Shipping Cost:</span>
                  <span className="font-medium">£{baseShipmentCost.toFixed(2)}</span>
                </div>
                
                {doorToDoor && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Door-to-Door Delivery:</span>
                    <span className="font-medium">£25.00</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Mandatory Metal Seal:</span>
                  <span className="font-medium">£5.00</span>
                </div>
                
                {paymentMethod === "cash-collection" && shipmentType === "drum" && (
                  <div className="flex justify-between text-green-600">
                    <span>Cash Collection Discount (10%):</span>
                    <span>-£{(baseShipmentCost * 0.1).toFixed(2)}</span>
                  </div>
                )}
                
                {paymentMethod === "goods-arriving" && (
                  <div className="flex justify-between text-yellow-700">
                    <span>Pay on Arrival Premium (20%):</span>
                    <span>+£{additionalCost.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>£{calculatedCost.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        );
      
      case BookingStep.REVIEW:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review Your Booking</h2>
            
            <div className="space-y-6">
              <Card>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Sender Details</h3>
                </div>
                <div className="p-4 space-y-2">
                  <p><span className="font-medium">Name:</span> {form.getValues().firstName} {form.getValues().lastName}</p>
                  <p><span className="font-medium">Email:</span> {form.getValues().email}</p>
                  <p><span className="font-medium">Phone:</span> {form.getValues().phone}</p>
                  <p><span className="font-medium">Address:</span> {form.getValues().pickupAddress}, {form.getValues().pickupPostcode}</p>
                </div>
              </Card>
              
              <Card>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Recipient Details</h3>
                </div>
                <div className="p-4 space-y-2">
                  <p><span className="font-medium">Name:</span> {form.getValues().recipientName}</p>
                  <p><span className="font-medium">Phone:</span> {form.getValues().recipientPhone}</p>
                  <p><span className="font-medium">Address:</span> {form.getValues().deliveryAddress}, {form.getValues().deliveryCity}, Zimbabwe</p>
                </div>
              </Card>
              
              <Card>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Shipment Details</h3>
                </div>
                <div className="p-4 space-y-2">
                  <p>
                    <span className="font-medium">Shipment Type:</span> 
                    {shipmentType === "drum" ? " Drum" : 
                     shipmentType === "parcel" ? " Other Items" : 
                     " Custom Item"}
                  </p>
                  
                  {shipmentType === "drum" && (
                    <p><span className="font-medium">Quantity:</span> {form.getValues().drumQuantity} drum(s)</p>
                  )}
                  
                  {shipmentType === "parcel" && (
                    <p><span className="font-medium">Weight:</span> {form.getValues().weight} kg</p>
                  )}
                  
                  {shipmentType === "custom" && (
                    <>
                      <p><span className="font-medium">Category:</span> {form.getValues().itemCategory}</p>
                      <p><span className="font-medium">Description:</span> {form.getValues().itemDescription}</p>
                    </>
                  )}
                  
                  <p>
                    <span className="font-medium">Door-to-Door Delivery:</span> 
                    {doorToDoor ? " Yes" : " No"}
                  </p>
                </div>
              </Card>
              
              <Card>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Payment Method</h3>
                </div>
                <div className="p-4 space-y-2">
                  <p>
                    <span className="font-medium">Method:</span> 
                    {paymentMethod === "cash-collection" ? " Cash on Collection" : 
                     paymentMethod === "30-day" ? " 30-Day Payment" : 
                     " Pay on Goods Arriving"}
                  </p>
                  
                  {paymentMethod === "30-day" && (
                    <p>
                      <span className="font-medium">Payment Type:</span> 
                      {form.getValues().paymentType === "cash" ? " Cash" : 
                       form.getValues().paymentType === "bank-transfer" ? " Bank Transfer" : 
                       " Direct Debit"}
                    </p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-bold">Total Amount: £{calculatedCost.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I accept the terms and conditions*</FormLabel>
                      <FormDescription>
                        By checking this box, you agree to our <Link to="/terms" className="text-zim-green underline">Terms and Conditions</Link> and <Link to="/privacy" className="text-zim-green underline">Privacy Policy</Link>
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          {renderProgress()}
          
          <div className="my-6">
            {renderStepContent()}
          </div>
          
          {currentStep === BookingStep.REVIEW && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Please review your booking details carefully before submitting. Once submitted, changes may require contacting customer support.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev}>
                Previous
              </Button>
            )}
            
            <div className="ml-auto">
              {currentStep < BookingStep.REVIEW ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" className="bg-zim-green hover:bg-zim-green/90" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Complete Booking"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </form>
    </Form>
  );
};

export default BookingForm;
