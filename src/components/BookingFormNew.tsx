import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { generateUniqueId } from '@/utils/utils';
import { useShipping } from '@/contexts/ShippingContext';
import { useAuth } from '@/contexts/AuthContext';
import CollectionInfo from '@/components/CollectionInfo';
import { ListAddresses } from '@/components/ListAddresses';
import { AddressForm } from '@/components/AddressForm';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, MinusCircle } from 'lucide-react';

const bookingFormSchema = z.object({
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
  pickupPostcode: z.string().optional(),
  pickupCity: z.string().optional(),
  pickupCountry: z.string(),
  recipientName: z.string().min(2, {
    message: "Recipient name must be at least 2 characters.",
  }),
  recipientPhone: z.string().min(8, {
    message: "Recipient phone number must be at least 8 characters.",
  }),
  additionalRecipientPhone: z.string().optional(),
  deliveryAddress: z.string().min(5, {
    message: "Delivery address must be at least 5 characters.",
  }),
  deliveryCity: z.string().min(2, {
    message: "Delivery city must be at least 2 characters.",
  }),
  includeDrums: z.boolean().default(false),
  drumQuantity: z.string().optional(),
  wantMetalSeal: z.boolean().default(false),
  includeOtherItems: z.boolean().default(false),
  itemCategory: z.string().optional(),
  specificItem: z.string().optional(),
  otherItemDescription: z.string().optional(),
  shipmentType: z.string().default('drum'),
  weight: z.string().optional(),
  doorToDoor: z.boolean().default(false),
  additionalDeliveryAddresses: z.array(z.object({
    address: z.string(),
    city: z.string()
  })).optional(),
  paymentOption: z.string().default('standard'),
  paymentMethod: z.string().default('card'),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  onSubmitComplete: (data: any, shipmentId: string, amount: number) => void;
}

const BookingFormNew: React.FC<BookingFormProps> = ({ onSubmitComplete }) => {
  const [collectionInfo, setCollectionInfo] = useState<{ route: string | null; collectionDate: string | null }>({
    route: null,
    collectionDate: null
  });
  const [shipmentId, setShipmentId] = useState<string>(generateUniqueId('shp_'));
  const [amount, setAmount] = useState<number>(0);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [additionalAddresses, setAdditionalAddresses] = useState<{ address: string; city: string; }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { calculateShippingCost } = useShipping();
  const { user } = useAuth();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: user?.user_metadata?.firstName || "",
      lastName: user?.user_metadata?.lastName || "",
      email: user?.email || "",
      phone: user?.user_metadata?.phone || "",
      pickupCountry: 'England',
      shipmentType: 'drum',
      paymentOption: 'standard',
      paymentMethod: 'card',
    },
    mode: "onChange"
  });

  const { watch, setValue, control, handleSubmit, formState: { isValid } } = form;

  const formData = watch();

  useEffect(() => {
    if (formData.pickupCountry && formData.pickupPostcode) {
      const cost = calculateShippingCost(formData.pickupCountry, formData.pickupPostcode, formData.shipmentType, formData.weight);
      setAmount(cost);
    }
  }, [formData.pickupCountry, formData.pickupPostcode, formData.shipmentType, formData.weight, calculateShippingCost]);

  const handleCollectionInfoReady = (data: { route: string | null; collectionDate: string | null }) => {
    setCollectionInfo(data);
  };

  const onSubmit = (data: BookingFormValues) => {
    if (!isValid) {
      toast({
        title: "Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    if (data.includeDrums && (!data.drumQuantity || parseInt(data.drumQuantity) <= 0)) {
      toast({
        title: "Error",
        description: "Please specify the number of drums.",
        variant: "destructive",
      });
      return;
    }

    if (data.includeOtherItems && (!data.itemCategory || !data.otherItemDescription)) {
      toast({
        title: "Error",
        description: "Please specify the item category and description.",
        variant: "destructive",
      });
      return;
    }

    if (data.shipmentType === 'parcel' && (!data.weight || parseFloat(data.weight) <= 0)) {
      toast({
        title: "Error",
        description: "Please specify the weight of the parcel.",
        variant: "destructive",
      });
      return;
    }

    onSubmitComplete(data, shipmentId, amount);
  };

  const handleAddAddress = () => {
    setIsAddingAddress(true);
    setShowAddressForm(true);
  };

  const handleAddressSubmit = (address: string, city: string) => {
    setAdditionalAddresses([...additionalAddresses, { address, city }]);
    setShowAddressForm(false);
    setIsAddingAddress(false);
  };

  const handleCancelAddress = () => {
    setShowAddressForm(false);
    setIsAddingAddress(false);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = [...additionalAddresses];
    newAddresses.splice(index, 1);
    setAdditionalAddresses(newAddresses);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sender Information</CardTitle>
            <CardDescription>Enter your personal details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup Information</CardTitle>
            <CardDescription>Enter your pickup details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={control}
              name="pickupAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Pickup address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="pickupPostcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Pickup postcode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="pickupCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup City</FormLabel>
                    <FormControl>
                      <Input placeholder="Pickup city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="pickupCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="England">England</SelectItem>
                      <SelectItem value="Ireland">Ireland</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CollectionInfo
              country={formData.pickupCountry}
              postalCode={formData.pickupPostcode}
              city={formData.pickupCity}
              onCollectionInfoReady={handleCollectionInfoReady}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recipient Information</CardTitle>
            <CardDescription>Enter your recipient details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Recipient name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Recipient phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="additionalRecipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Recipient Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional recipient phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Delivery address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="deliveryCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery City</FormLabel>
                  <FormControl>
                    <Input placeholder="Delivery city" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
            <CardDescription>Enter your shipment details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={control}
              name="shipmentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Shipment Type</FormLabel>
                  <div className="space-y-2">
                    <FormItem>
                      <div className="space-x-2 inline-flex items-center">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "drum"}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange("drum")
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Drums</FormLabel>
                      </div>
                    </FormItem>
                    <FormItem>
                      <div className="space-x-2 inline-flex items-center">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "parcel"}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange("parcel")
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Parcels</FormLabel>
                      </div>
                    </FormItem>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formData.shipmentType === 'parcel' && (
              <FormField
                control={control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input placeholder="Weight in kilograms" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={control}
              name="includeDrums"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Include Drums</FormLabel>
                    <FormDescription>Do you want to include drums in your shipment?</FormDescription>
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

            {formData.includeDrums && (
              <>
                <FormField
                  control={control}
                  name="drumQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Drums</FormLabel>
                      <FormControl>
                        <Input placeholder="Number of drums" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="wantMetalSeal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Want Metal Seal?</FormLabel>
                        <FormDescription>Do you want a metal seal for your drums?</FormDescription>
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
              </>
            )}

            <FormField
              control={control}
              name="includeOtherItems"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Include Other Items</FormLabel>
                    <FormDescription>Do you want to include other items in your shipment?</FormDescription>
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

            {formData.includeOtherItems && (
              <>
                <FormField
                  control={control}
                  name="itemCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="furniture">Furniture</SelectItem>
                          <SelectItem value="documents">Documents</SelectItem>
                          <SelectItem value="food">Food Items</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="specificItem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Item</FormLabel>
                      <FormControl>
                        <Input placeholder="Specific item" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="otherItemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Item Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Other item description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
    
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-amber-400 hover:bg-amber-500 text-black"
                    onClick={() => {
                      // Navigate to the custom quote form with current data
                      navigate('/custom-quote-form', {
                        state: {
                          category: formData.itemCategory,
                          description: formData.otherItemDescription,
                          phoneNumber: formData.phone,
                          email: formData.email,
                          name: `${formData.firstName} ${formData.lastName}`,
                          senderDetails: {
                            name: `${formData.firstName} ${formData.lastName}`,
                            email: formData.email,
                            phone: formData.phone,
                            address: formData.pickupAddress
                          },
                          recipientDetails: {
                            name: formData.recipientName,
                            phone: formData.recipientPhone,
                            address: formData.deliveryAddress
                          },
                          shipmentId: shipmentId
                        }
                      });
                    }}
                  >
                    Request Custom Quote for Other Item
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Options</CardTitle>
            <CardDescription>Select additional options for your shipment</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={control}
              name="doorToDoor"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Door to Door Delivery</FormLabel>
                    <FormDescription>Do you want us to deliver the shipment to the recipient's door?</FormDescription>
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

            {formData.doorToDoor && (
              <>
                <Separator className="my-4" />
                <CardTitle className="text-md">Additional Delivery Addresses</CardTitle>
                <CardDescription>Add additional delivery addresses if needed</CardDescription>

                <ListAddresses
                  addresses={additionalAddresses}
                  onRemoveAddress={handleRemoveAddress}
                />

                {!showAddressForm && (
                  <Button type="button" variant="secondary" onClick={handleAddAddress} disabled={isAddingAddress}>
                    {isAddingAddress ? 'Adding...' :
                      <>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Address
                      </>
                    }
                  </Button>
                )}

                {showAddressForm && (
                  <AddressForm
                    onSubmit={handleAddressSubmit}
                    onCancel={handleCancelAddress}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-zim-green hover:bg-zim-green/90" disabled={!isValid}>
          Submit
        </Button>
      </form>
    </Form>
  );
};

export default BookingFormNew;
