import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectValue, SelectTrigger, SelectContent, SelectItem, Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { generateUniqueId } from '@/lib/utils';
import { getRouteForPostalCode, getAreasFromPostalCode } from '@/utils/postalCodeUtils';
import CollectionInfo from '@/components/CollectionInfo';
import IrelandCityInput from '@/components/IrelandCityInput';

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(8, {
    message: "Phone number must be at least 8 characters.",
  }),
  pickupAddress: z.string().min(5, {
    message: "Pickup address must be at least 5 characters.",
  }),
  pickupPostcode: z.string().min(5, {
    message: "Pickup postcode must be at least 5 characters.",
  }),
  deliveryAddress: z.string().min(5, {
    message: "Delivery address must be at least 5 characters.",
  }),
  deliveryCity: z.string().min(2, {
    message: "Delivery city must be at least 2 characters.",
  }),
  recipientName: z.string().min(2, {
    message: "Recipient name must be at least 2 characters.",
  }),
  recipientPhone: z.string().min(8, {
    message: "Recipient phone must be at least 8 characters.",
  }),
  shipmentType: z.enum(['parcel', 'drum', 'other', 'custom'], {
    required_error: "Please select a shipment type.",
  }),
  weight: z.string().optional(),
  drumQuantity: z.string().optional(),
  itemCategory: z.string().optional(),
  itemDescription: z.string().optional(),
  collectionDate: z.string().optional(),
  collectionRoute: z.string().optional(),
  doorToDoor: z.boolean().default(false),
  paymentOption: z.enum(['standard', 'payLater', 'cashOnCollection', 'goodsArriving'], {
    required_error: "Please select a payment option.",
  }),
  paymentMethod: z.enum(['card', 'cash', 'bank_transfer', 'direct_debit'], {
    required_error: "Please select a payment method.",
  }).optional(),
});

interface BookingFormProps {
  onSubmitComplete: (data: any, shipmentId: string, amount: number) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [collectionAreas, setCollectionAreas] = useState<string[]>([]);
  const [collectionRoute, setCollectionRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shipmentCost, setShipmentCost] = useState(0);
  const [showCollectionInfo, setShowCollectionInfo] = useState(false);
  const [pickupCountry, setPickupCountry] = useState('England');
  const [irelandCity, setIrelandCity] = useState('');
  const [irelandRoute, setIrelandRoute] = useState<string | null>(null);
  const [irelandCollectionDate, setIrelandCollectionDate] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      pickupAddress: "",
      pickupPostcode: "",
      deliveryAddress: "",
      deliveryCity: "",
      recipientName: "",
      recipientPhone: "",
      shipmentType: "parcel",
      weight: "",
      drumQuantity: "",
      itemCategory: "",
      itemDescription: "",
      collectionDate: "",
      collectionRoute: "",
      doorToDoor: false,
      paymentOption: "standard",
      paymentMethod: "card",
    },
  });

  const { watch, setValue } = form;

  const formData = watch();

  useEffect(() => {
    const calculateShipmentCost = () => {
      let cost = 0;
      
      // Base cost for parcel
      if (formData.shipmentType === 'parcel') {
        const weight = parseFloat(formData.weight || '0');
        if (weight > 0 && weight <= 5) {
          cost = 35;
        } else if (weight > 5 && weight <= 10) {
          cost = 45;
        } else if (weight > 10 && weight <= 15) {
          cost = 55;
        } else if (weight > 15 && weight <= 20) {
          cost = 65;
        } else if (weight > 20) {
          cost = 85;
        }
      }
      // Base cost for drum
      else if (formData.shipmentType === 'drum') {
        const quantity = parseInt(formData.drumQuantity || '0');
        if (quantity > 0 && quantity <= 2) {
          cost = 120;
        } else if (quantity > 2 && quantity <= 4) {
          cost = 240;
        } else if (quantity > 4 && quantity <= 6) {
          cost = 360;
        } else if (quantity > 6) {
          cost = 480;
        }
      }
      // Base cost for other
      else if (formData.shipmentType === 'other') {
        cost = 100;
      }
      // Custom quote
      else if (formData.shipmentType === 'custom') {
        cost = 0;
      }
      
      setShipmentCost(cost);
    };
    
    calculateShipmentCost();
  }, [formData.shipmentType, formData.weight, formData.drumQuantity]);

  const handlePostcodeChange = (postcode: string) => {
    if (postcode) {
      const route = getRouteForPostalCode(postcode);
      const areas = getAreasFromPostalCode(postcode);
      
      setCollectionRoute(route);
      setCollectionAreas(areas);
      setShowCollectionInfo(true);
      
      // Update form values
      setValue('collectionRoute', route || '');
      setValue('collectionDate', ''); // Clear date, will be set in CollectionInfo
    } else {
      setCollectionRoute(null);
      setCollectionAreas([]);
      setShowCollectionInfo(false);
      
      // Clear form values
      setValue('collectionRoute', '');
      setValue('collectionDate', '');
    }
  };

  const handleIrelandCityChange = (city: string, route: string | null, collectionDate: string | null) => {
    setIrelandCity(city);
    setIrelandRoute(route);
    setIrelandCollectionDate(collectionDate);
    
    // If a valid route is found, we can update the collectionDate
    if (route && collectionDate) {
      setValue('collectionDate', collectionDate);
      setValue('collectionRoute', route);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create a data object from the form values
      const submitData = {
        ...formData,
        pickupCountry: pickupCountry,
        // Include Ireland-specific data if applicable
        ...(pickupCountry === 'Ireland' && {
          irelandCity: irelandCity,
          irelandRoute: irelandRoute,
          irelandCollectionDate: irelandCollectionDate
        })
      };
      
      // Generate a unique shipment ID
      const shipmentId = generateUniqueId();
      
      // Validate form
      form.handleSubmit(async (values) => {
        // Call the onSubmitComplete function with the form data, shipment ID, and shipment cost
        onSubmitComplete(submitData, shipmentId, shipmentCost);
      })();
      
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Submission Error",
        description: "Failed to submit the form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
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
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe@example.com" {...field} />
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
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input placeholder="+44 7123 456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="mb-6">
          <Label htmlFor="pickupCountry">Pickup Country</Label>
          <Select 
            value={pickupCountry} 
            onValueChange={(value) => setPickupCountry(value)}
          >
            <SelectTrigger id="pickupCountry" className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="England">England</SelectItem>
              <SelectItem value="Ireland">Ireland</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {pickupCountry === 'England' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
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
                    <FormLabel>Pickup postcode</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Postcode"
                        {...field}
                        onBlur={(e) => handlePostcodeChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showCollectionInfo && collectionRoute && (
              <CollectionInfo
                route={collectionRoute}
                areas={collectionAreas}
                onDateChange={(date) => setValue("collectionDate", date)}
              />
            )}
          </>
        )}

        {pickupCountry === 'Ireland' && (
          <IrelandCityInput 
            onChange={handleIrelandCityChange} 
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="deliveryAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery address</FormLabel>
                <FormControl>
                  <Input placeholder="456 High Street" {...field} />
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
                <FormLabel>Delivery city</FormLabel>
                <FormControl>
                  <Input placeholder="New York" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="recipientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Smith" {...field} />
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
                <FormLabel>Recipient phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 555-123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="shipmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of shipment</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parcel">Parcel</SelectItem>
                    <SelectItem value="drum">Drum</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="custom">Request Custom Quote</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formData.shipmentType === 'parcel' && (
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (in kg)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Enter weight" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {formData.shipmentType === 'drum' && (
          <FormField
            control={form.control}
            name="drumQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of drums</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Enter quantity" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {formData.shipmentType === 'other' && (
          <>
            <FormField
              control={form.control}
              name="itemCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Electronics" {...field} />
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
                  <FormLabel>Item Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the item" {...field} />
                  </FormControl>
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Door to Door Delivery</FormLabel>
                <p className="text-sm text-muted-foreground">
                  We'll handle pickup and delivery to the recipient's door.
                </p>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="paymentOption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Option</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="standard" id="payment-standard" />
                    </FormControl>
                    <FormLabel htmlFor="payment-standard">Standard Payment</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="payLater" id="payment-payLater" />
                    </FormControl>
                    <FormLabel htmlFor="payment-payLater">Pay Later</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="cashOnCollection" id="payment-cashOnCollection" />
                    </FormControl>
                    <FormLabel htmlFor="payment-cashOnCollection">Cash on Collection</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="goodsArriving" id="payment-goodsArriving" />
                    </FormControl>
                    <FormLabel htmlFor="payment-goodsArriving">Pay on Goods Arriving in Zimbabwe</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formData.paymentOption === 'standard' && (
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="direct_debit">Direct Debit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <Button type="submit" disabled={isSubmitting} className="w-full bg-zim-green hover:bg-zim-green/90">
          {isSubmitting ? "Submitting..." : "Complete Booking"}
        </Button>
      </form>
    </Form>
  );
};

export default BookingForm;
