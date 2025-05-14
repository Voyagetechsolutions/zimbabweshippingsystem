
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { useShipping } from '@/contexts/ShippingContext';
import { supabase } from '@/integrations/supabase/client';
import { OriginCountries, DestinationCountries } from '@/constants';
import { calculateShippingCost } from '@/utils/shippingCalculator';
import { formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/Icons"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Validation schema using Yup
const schema = yup.object({
  originCountry: yup.string().required('Origin Country is required'),
  destinationCountry: yup.string().required('Destination Country is required'),
  includeDrums: yup.boolean().required(),
  quantity: yup.number().positive('Quantity must be positive').integer('Quantity must be an integer').when('includeDrums', {
    is: true,
    then: () => yup.number().required('Quantity is required').positive('Quantity must be positive').integer('Quantity must be an integer'),
    otherwise: () => yup.number().notRequired().nullable(),
  }),
  includeOtherItems: yup.boolean().required(),
  category: yup.string().when('includeOtherItems', {
    is: true,
    then: () => yup.string().required('Category is required'),
    otherwise: () => yup.string().notRequired().nullable(),
  }),
  description: yup.string().when('includeOtherItems', {
    is: true,
    then: () => yup.string().required('Description is required'),
    otherwise: () => yup.string().notRequired().nullable(),
  }),
  specificItem: yup.string().when('includeOtherItems', {
    is: true,
    then: () => yup.string().required('Specific Item is required'),
    otherwise: () => yup.string().notRequired().nullable(),
  }),
  additionalNotes: yup.string().notRequired().nullable(),
  contactPreference: yup.string().required('Contact Preference is required'),
}).required();

const BookShipment = () => {
  const { user } = useAuth();
  const { setShipmentDetails } = useShipping();
  const navigate = useNavigate();
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      originCountry: '',
      destinationCountry: '',
      includeDrums: false,
      quantity: 1,
      includeOtherItems: false,
      category: '',
      description: '',
      specificItem: '',
      additionalNotes: '',
      contactPreference: 'email',
    }
  });

  const originCountryValue = watch("originCountry");
  const destinationCountryValue = watch("destinationCountry");
  const includeDrumsValue = watch("includeDrums");
  const includeOtherItemsValue = watch("includeOtherItems");

  useEffect(() => {
    document.title = 'Book Shipment | UK to Zimbabwe Shipping';
  }, []);

  useEffect(() => {
    if (originCountryValue && destinationCountryValue) {
      const cost = calculateShippingCost(originCountryValue, destinationCountryValue);
      setShippingCost(cost);
    } else {
      setShippingCost(null);
    }
  }, [originCountryValue, destinationCountryValue]);

  const onSubmit = (data: any) => {
    if (!user) {
      toast({
        title: "Not authenticated.",
        description: "You must sign in to book a shipment.",
      });
      navigate('/auth');
      return;
    }

    setShipmentDetails(data);
    navigate('/collection-schedule');
  };

  const handleCustomQuoteSubmit = async () => {
    if (!user) {
      toast({
        title: "Not authenticated.",
        description: "You must sign in to submit a custom quote.",
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    try {
      // Trigger validation to display errors
      const isValid = await schema.validate(watch(), { abortEarly: false });

      if (!isValid) {
        toast({
          title: 'Form Validation Error',
          description: 'Please check your inputs and try again.',
          variant: 'destructive',
        });
        return;
      }

      const formData = watch();
      
      // Create a custom quote in the database
      try {
        const { data: quoteData, error: quoteError } = await supabase
          .from('custom_quotes')
          .insert({
            user_id: user.id,
            description: formData.description || `Shipping from ${formData.originCountry} to ${formData.destinationCountry}`,
            phone_number: user.phone || '000-000-0000', // Fallback if user doesn't have phone number
            status: 'pending',
            category: formData.category || '',
            specific_item: formData.specificItem || '',
            admin_notes: formData.additionalNotes || '',
            name: user.email.split('@')[0] || user.email, // Use username part of email as fallback
            email: user.email
          })
          .select()
          .single();

        if (quoteError) {
          console.error('Error submitting quote:', quoteError);
          toast({
            title: 'Quote Submission Failed',
            description: 'There was an error submitting your quote. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        // Try to create notification, but don't block the main flow if it fails
        try {
          await supabase
            .from('notifications')
            .insert([{
              user_id: user.id,
              title: 'Custom Quote Submitted',
              message: 'Your custom quote request has been received. We will contact you soon.',
              type: 'quote',
              related_id: quoteData.id,
              is_read: false
            }]);
        } catch (notificationError) {
          // Just log the notification error, don't interrupt the flow
          console.error('Error creating notification:', notificationError);
        }

        toast({
          title: 'Quote Submitted Successfully',
          description: 'Your custom quote request has been submitted. We will contact you soon.',
        });
        navigate('/quote-submitted');
      } catch (error) {
        console.error('Error in custom quote submission:', error);
        toast({
          title: 'Quote Submission Failed',
          description: 'There was an error submitting your quote. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in custom quote submission:', error);
      toast({
        title: 'Form Validation Error',
        description: 'Please check your inputs and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Book a Shipment</CardTitle>
              <CardDescription>Fill in the details below to book your shipment.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="originCountry">Origin Country</Label>
                  <Select onValueChange={(value) => setValue('originCountry', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select origin country" />
                    </SelectTrigger>
                    <SelectContent>
                      {OriginCountries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.originCountry && <p className="text-red-500 text-sm">{errors.originCountry?.message}</p>}
                </div>
                <div>
                  <Label htmlFor="destinationCountry">Destination Country</Label>
                  <Select onValueChange={(value) => setValue('destinationCountry', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select destination country" />
                    </SelectTrigger>
                    <SelectContent>
                      {DestinationCountries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destinationCountry && <p className="text-red-500 text-sm">{errors.destinationCountry?.message}</p>}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label htmlFor="includeDrums">Include Drums?</Label>
                  <p className="text-sm text-muted-foreground">Are you shipping items in drums?</p>
                  <Controller
                    control={control}
                    name="includeDrums"
                    render={({ field }) => (
                      <RadioGroup onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"} className="flex flex-row space-x-2">
                        <RadioGroupItem value="true" id="drums-yes" />
                        <Label htmlFor="drums-yes">Yes</Label>
                        <RadioGroupItem value="false" id="drums-no" />
                        <Label htmlFor="drums-no">No</Label>
                      </RadioGroup>
                    )}
                  />
                  {errors.includeDrums && <p className="text-red-500 text-sm">{errors.includeDrums?.message}</p>}
                </div>
                {includeDrumsValue && (
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Number of Drums</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Number of drums"
                      {...register('quantity', { valueAsNumber: true })}
                    />
                    {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity?.message}</p>}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label htmlFor="includeOtherItems">Include Other Items?</Label>
                  <p className="text-sm text-muted-foreground">Are you shipping other items besides drums?</p>
                  <Controller
                    control={control}
                    name="includeOtherItems"
                    render={({ field }) => (
                      <RadioGroup onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? "true" : "false"} className="flex flex-row space-x-2">
                        <RadioGroupItem value="true" id="other-items-yes" />
                        <Label htmlFor="other-items-yes">Yes</Label>
                        <RadioGroupItem value="false" id="other-items-no" />
                        <Label htmlFor="other-items-no">No</Label>
                      </RadioGroup>
                    )}
                  />
                  {errors.includeOtherItems && <p className="text-red-500 text-sm">{errors.includeOtherItems?.message}</p>}
                </div>
                {includeOtherItemsValue && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        type="text"
                        placeholder="e.g., Electronics, Clothing, Personal Effects"
                        {...register('category')}
                      />
                      {errors.category && <p className="text-red-500 text-sm">{errors.category?.message}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        type="text"
                        placeholder="e.g., Used household items"
                        {...register('description')}
                      />
                      {errors.description && <p className="text-red-500 text-sm">{errors.description?.message}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="specificItem">Specific Item</Label>
                      <Input
                        type="text"
                        placeholder="e.g., TV, Sofa, Books"
                        {...register('specificItem')}
                      />
                      {errors.specificItem && <p className="text-red-500 text-sm">{errors.specificItem?.message}</p>}
                    </div>
                  </>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  placeholder="Any additional notes you want to add?"
                  {...register('additionalNotes')}
                />
                {errors.additionalNotes && <p className="text-red-500 text-sm">{errors.additionalNotes?.message}</p>}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-2">
                <Label>Contact Preference</Label>
                <Controller
                  control={control}
                  name="contactPreference"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="email" id="contact-email" />
                        <Label htmlFor="contact-email">Email</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="phone" id="contact-phone" />
                        <Label htmlFor="contact-phone">Phone</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.contactPreference && <p className="text-red-500 text-sm">{errors.contactPreference?.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {shippingCost !== null ? (
                <span className="text-green-500">Estimated shipping cost: {formatCurrency(shippingCost, 'GBP')}</span>
              ) : (
                <span className="text-gray-500">Enter origin and destination to calculate shipping cost</span>
              )}
              <Button onClick={handleSubmit(onSubmit)}>
                Continue to Schedule <Icons.arrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <Accordion type="single" collapsible>
            <AccordionItem value="custom-quote">
              <AccordionTrigger>Need a Custom Quote?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-4">
                  If you have specific requirements or large volume shipments, you can request a custom quote.
                </p>
                <Button variant="outline" onClick={handleCustomQuoteSubmit} disabled={isLoading}>
                  {isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Request a Custom Quote
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BookShipment;
