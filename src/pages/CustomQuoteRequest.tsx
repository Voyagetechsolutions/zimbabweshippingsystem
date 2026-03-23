import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import WhatsAppButton from '@/components/WhatsAppButton';
import { Package, Phone, Clock, Check, ArrowRight } from 'lucide-react';

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
    'Furniture',
    'Electronics',
    'Appliances',
    'Clothing & Textiles',
    'Food & Beverages',
    'Household Items',
    'Sports Equipment',
    'Tools & Hardware',
    'Medical Supplies',
    'Automotive Parts',
    'Commercial Goods',
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
      <Helmet>
        <title>Get a Quote | Zimbabwe Shipping - Custom Item Pricing</title>
        <meta name="description" content="Get a custom quote for shipping furniture, appliances, electronics and more from UK to Zimbabwe. Free quotes within 24 hours." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex p-4 bg-zim-yellow/20 rounded-full mb-4">
              <Package className="h-8 w-8 text-zim-yellow" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get a Custom Quote
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Shipping something other than drums? Tell us about it and we'll give you a price.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-5 gap-12">
                {/* Form */}
                <div className="md:col-span-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Tell Us About Your Item</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">We'll respond with a quote within 24 hours.</p>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="itemCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">What are you shipping?</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 bg-white dark:bg-gray-700 dark:border-gray-600">
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
                              <FormLabel className="text-base font-semibold">Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Include dimensions, weight, and any special requirements..."
                                  className="min-h-[140px] bg-white dark:bg-gray-700 dark:border-gray-600 resize-none"
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
                              <FormLabel className="text-base font-semibold">Your Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="+44 7XXX XXXXXX"
                                  className="h-12 bg-white dark:bg-gray-700 dark:border-gray-600"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 h-12 bg-zim-green hover:bg-zim-green/90 text-lg"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center gap-2">
                                <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Submitting...
                              </span>
                            ) : (
                              <>
                                Submit Request
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="h-12"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                </div>

                {/* Side Info */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold mb-4">What We Can Ship</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                        <span>Furniture & appliances</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                        <span>Electronics & gadgets</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                        <span>Commercial goods</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                        <span>Vehicles & machinery</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                        <span>Personal effects</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-zim-green/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="h-5 w-5 text-zim-green" />
                      <h3 className="font-semibold">Quick Response</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      We aim to respond to all quote requests within 24 hours.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Phone className="h-5 w-5 text-zim-green" />
                      <h3 className="font-semibold">Prefer to Call?</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Speak to us directly for an instant quote.
                    </p>
                    <a href="tel:+447584100552">
                      <Button variant="outline" className="w-full">
                        <Phone className="mr-2 h-4 w-4" />
                        +44 7584 100552
                      </Button>
                    </a>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Shipping drums?</p>
                    <Link to="/book" className="text-zim-green font-medium hover:underline">
                      Book drums directly →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default CustomQuoteRequest;
