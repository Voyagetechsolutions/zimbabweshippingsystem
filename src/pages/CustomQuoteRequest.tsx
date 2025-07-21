
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const formSchema = z.object({
  itemCategory: z.string().min(1, 'Please select a category'),
  itemDescription: z.string().min(10, 'Please provide a detailed description (minimum 10 characters)'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
});

type FormValues = z.infer<typeof formSchema>;

const CustomQuoteRequest = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemCategory: '',
      itemDescription: '',
      phoneNumber: '',
    },
  });

  const itemCategories = [
    'Electronics',
    'Clothing & Textiles',
    'Food & Beverages',
    'Books & Documents',
    'Household Items',
    'Sports Equipment',
    'Tools & Hardware',
    'Medical Supplies',
    'Automotive Parts',
    'Other',
  ];

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_quotes')
        .insert({
          user_id: user?.id || null,
          phone_number: values.phoneNumber,
          description: values.itemDescription,
          category: values.itemCategory,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create a notification for admins
      await supabase.from('notifications').insert({
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        title: 'New Custom Quote Request',
        message: `A new custom quote request has been submitted for: ${values.itemCategory}`,
        type: 'custom_quote',
        related_id: data.id,
        is_read: false
      });

      toast({
        title: "Quote Request Submitted",
        description: "We'll contact you shortly with a price for your shipment.",
      });

      navigate('/quote-submitted');
    } catch (error: any) {
      console.error('Error submitting custom quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit quote request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Request Custom Quote</CardTitle>
              <CardDescription>
                Tell us about your item so we can provide a custom shipping quote.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="itemCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {itemCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Textarea
                            placeholder="Describe the item you want to ship"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Enter your phone number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-zim-green hover:bg-zim-green/90"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CustomQuoteRequest;
