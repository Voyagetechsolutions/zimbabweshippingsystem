import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

const bookingFormSchema = z.object({
  customer_details: z.object({
    full_name: z.string().min(2, {
      message: "Full name must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Invalid email address.",
    }),
    phone_number: z.string().min(8, {
      message: "Phone number must be at least 8 characters.",
    }),
  }),
  collection_details: z.object({
    country: z.string().min(2, {
      message: "Country must be at least 2 characters.",
    }),
    address: z.string().min(5, {
      message: "Address must be at least 5 characters.",
    }),
    city: z.string().min(2, {
      message: "City must be at least 2 characters.",
    }),
    postal_code: z.string().min(3, {
      message: "Postal code must be at least 3 characters.",
    }),
  }),
  delivery_details: z.object({
    recipient_name: z.string().min(2, {
      message: "Recipient name must be at least 2 characters.",
    }),
    recipient_phone: z.string().min(8, {
      message: "Recipient phone must be at least 8 characters.",
    }),
    recipient_address: z.string().min(5, {
      message: "Recipient address must be at least 5 characters.",
    }),
    recipient_city: z.string().min(2, {
      message: "Recipient city must be at least 2 characters.",
    }),
    recipient_country: z.string().min(2, {
      message: "Recipient country must be at least 2 characters.",
    }),
  }),
  shipment_details: z.object({
    items_description: z.string().min(10, {
      message: "Items description must be at least 10 characters.",
    }),
    number_of_drums: z.number().min(1, {
      message: "Number of drums must be at least 1.",
    }),
    total_weight: z.number().min(1, {
      message: "Total weight must be at least 1 kg.",
    }),
    collection_date: z.date({
      required_error: "A collection date is required.",
    }),
  }),
  additional_instructions: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const BookingFormNew = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isCollectionToday, setIsCollectionToday] = useState(false);
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isSlotSelectionRequired, setIsSlotSelectionRequired] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('England');
  const [irelandCities, setIrelandCities] = useState([
    'Dublin',
    'Cork',
    'Galway',
    'Limerick',
    'Waterford',
    'Belfast',
    'Derry',
    'Sligo',
    'Kilkenny',
    'Athlone',
    'Drogheda',
    'Dundalk'
  ]);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { session } = useAuth();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customer_details: {
        full_name: session?.user?.user_metadata?.full_name || '',
        email: session?.user?.email || '',
        phone_number: '',
      },
      collection_details: {
        country: 'England',
        address: '',
        city: '',
        postal_code: '',
      },
      delivery_details: {
        recipient_name: '',
        recipient_phone: '',
        recipient_address: '',
        recipient_city: '',
        recipient_country: 'Zimbabwe',
      },
      shipment_details: {
        items_description: '',
        number_of_drums: 1,
        total_weight: 20,
        collection_date: new Date(),
      },
      additional_instructions: '',
    },
  });

  const { watch, setValue } = form;
  const collectionDate = watch("shipment_details.collection_date");

  useEffect(() => {
    const today = new Date();
    const isToday = collectionDate && 
      collectionDate.getDate() === today.getDate() &&
      collectionDate.getMonth() === today.getMonth() &&
      collectionDate.getFullYear() === today.getFullYear();
    setIsCollectionToday(isToday);
  }, [collectionDate]);

  const fetchCollectionSchedules = useCallback(async (date: Date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from(tableFrom('collection_schedules'))
        .select('*')
        .eq('collection_date', formattedDate);

      if (error) {
        console.error("Error fetching collection schedules:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load collection schedules. Please try again."
        });
        return;
      }

      setCollectionSchedules(data);
      setIsSlotSelectionRequired(data.length > 0);
    } catch (error: any) {
      console.error("Unexpected error fetching collection schedules:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load collection schedules. Please try again."
      });
    }
  }, [supabase, toast]);

  useEffect(() => {
    if (collectionDate) {
      fetchCollectionSchedules(collectionDate);
    }
  }, [collectionDate, fetchCollectionSchedules]);

  useEffect(() => {
    if (collectionSchedules.length > 0) {
      const slots = collectionSchedules.map(schedule => schedule.available_slots).flat();
      setAvailableSlots(slots);
    } else {
      setAvailableSlots([]);
    }
    setSelectedSlot(null);
  }, [collectionSchedules]);

  const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSchedule(e.target.value);
    const selected = collectionSchedules.find(schedule => schedule.id === e.target.value);
    if (selected) {
      setAvailableSlots(selected.available_slots);
    } else {
      setAvailableSlots([]);
    }
    setSelectedSlot(null);
  };

  const handleSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSlot(e.target.value);
  };

  const handleCollectionDetailChange = (field: string, value: string) => {
    setValue(`collection_details.${field}`, value);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);
    setValue(
        'collection_details.country',
        country
    );
  };

  const onSubmit = async (values: BookingFormValues) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Create a new shipment record in Supabase
      const { data: shipmentData, error: shipmentError } = await supabase
        .from(tableFrom('shipments'))
        .insert([
          {
            ...values,
            collection_slot: selectedSlot,
            user_id: session?.user?.id,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (shipmentError) {
        console.error("Shipment creation error:", shipmentError);
        setSubmissionError(shipmentError.message || 'Failed to create shipment.');
        toast({
          variant: "destructive",
          title: "Error",
          description: shipmentError.message || "Could not create shipment"
        });
        return;
      }

      // If shipment created successfully, navigate to payment page
      navigate(`/payment/${shipmentData.id}`);
      toast({
        title: "Success",
        description: "Shipment created successfully! Redirecting to payment...",
      });
    } catch (error: any) {
      console.error("Unexpected error during submission:", error);
      setSubmissionError(error.message || 'An unexpected error occurred.');
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {submissionError && (
          <div className="rounded-md bg-red-100 p-4">
            <div className="text-sm text-red-700">{submissionError}</div>
          </div>
        )}

        {/* Customer Details */}
        <div>
          <h3 className="text-lg font-medium">Customer Details</h3>
          <p className="text-sm text-gray-500">Please enter your contact information.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="customer_details.full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer_details.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer_details.phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+447123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Collection Details */}
        <div>
          <h3 className="text-lg font-medium">Pickup Location</h3>
          <p className="text-sm text-gray-500">Enter the address where we should pick up the shipment.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select 
                value={selectedCountry}
                onValueChange={(value) => {
                  setSelectedCountry(value);
                  setValue(
                      'collection_details.country',
                      value
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="England">England</SelectItem>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Wales">Wales</SelectItem>
                  <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
                  <SelectItem value="Ireland">Ireland</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="collection_address">Collection Address</Label>
              <Input
                id="collection_address"
                placeholder="Address for pickup"
                value={form.getValues('collection_details.address') || ''}
                onChange={(e) => handleCollectionDetailChange('address', e.target.value)}
                required
              />
            </div>
            
            {selectedCountry === 'Ireland' ? (
              <div>
                <Label htmlFor="collection_city">City</Label>
                <Select
                  value={form.getValues('collection_details.city') || ''}
                  onValueChange={(value) => {
                    handleCollectionDetailChange('city', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {irelandCities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="collection_city">City</Label>
                <Input
                  id="collection_city"
                  placeholder="City"
                  value={form.getValues('collection_details.city') || ''}
                  onChange={(e) => handleCollectionDetailChange('city', e.target.value)}
                  required
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="collection_postal_code">Postal Code</Label>
              <Input
                id="collection_postal_code"
                placeholder="Postal code"
                value={form.getValues('collection_details.postal_code') || ''}
                onChange={(e) => handleCollectionDetailChange('postal_code', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div>
          <h3 className="text-lg font-medium">Delivery Details</h3>
          <p className="text-sm text-gray-500">Enter the recipient's address in Zimbabwe.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="delivery_details.recipient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Alice Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delivery_details.recipient_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+263777123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delivery_details.recipient_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street, Harare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delivery_details.recipient_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient City</FormLabel>
                  <FormControl>
                    <Input placeholder="Harare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delivery_details.recipient_country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Zimbabwe" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Shipment Details */}
        <div>
          <h3 className="text-lg font-medium">Shipment Details</h3>
          <p className="text-sm text-gray-500">Information about the items you are shipping.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="shipment_details.items_description"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Items Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the items being shipped"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shipment_details.number_of_drums"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Drums</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1"
                      defaultValue="1"
                      min="1"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        field.onChange(isNaN(value) ? 1 : Math.max(1, value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shipment_details.total_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Weight (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="20"
                      defaultValue="20"
                      min="1"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        field.onChange(isNaN(value) ? 1 : Math.max(1, value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shipment_details.collection_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Collection Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3.5 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Collection Slot Selection */}
        {isCollectionToday && isSlotSelectionRequired && (
          <div>
            <h3 className="text-lg font-medium">Collection Slot</h3>
            <p className="text-sm text-gray-500">Select an available collection slot for today.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {collectionSchedules.length > 1 ? (
                <div>
                  <Label htmlFor="schedule">Collection Schedule</Label>
                  <Select
                    id="schedule"
                    value={selectedSchedule || ''}
                    onChange={handleScheduleChange}
                  >
                    <option value="">Select Schedule</option>
                    {collectionSchedules.map(schedule => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name} ({schedule.available_slots.length} slots)
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Only one collection schedule available for today.
                </p>
              )}

              <div>
                <Label htmlFor="slot">Available Slot</Label>
                <Select
                  id="slot"
                  value={selectedSlot || ''}
                  onChange={handleSlotChange}
                  disabled={availableSlots.length === 0}
                >
                  <option value="">Select Slot</option>
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </Select>
                {availableSlots.length === 0 && (
                  <p className="text-sm text-red-500 mt-2">No slots available for the selected schedule.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Additional Instructions */}
        <div>
          <h3 className="text-lg font-medium">Additional Instructions</h3>
          <p className="text-sm text-gray-500">Do you have any special instructions for the collection?</p>
          <FormField
            control={form.control}
            name="additional_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Leave the drums at the back gate."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting} className="w-full bg-zim-green hover:bg-zim-green/90">
          {isSubmitting ? (isMobile ? "Submitting..." : "Submitting Booking Form...") : (isMobile ? "Book Shipment" : "Submit Booking Form")}
        </Button>
      </form>
    </Form>
  );
};

export default BookingFormNew;
