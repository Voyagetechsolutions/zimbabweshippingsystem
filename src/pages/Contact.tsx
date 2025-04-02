
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Map, Mail, Phone, Clock } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  subject: z.string().min(5, { message: 'Subject must be at least 5 characters' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters' }),
});

type FormValues = z.infer<typeof formSchema>;

const Contact = () => {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log('Form submitted:', data);
    
    // In a real app, you would send this data to your backend
    toast({
      title: "Message Sent",
      description: "Thank you for your message. We'll respond shortly.",
    });
    
    form.reset();
  };

  const businessHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-zim-green/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Have questions or need assistance? Reach out to our team and we'll be happy to help.
            </p>
          </div>
        </div>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-2xl font-bold mb-8">Get In Touch</h2>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="What is this regarding?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please describe your inquiry in detail" 
                              className="min-h-[120px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="bg-zim-green hover:bg-zim-green/90 w-full md:w-auto"
                    >
                      Send Message
                    </Button>
                  </form>
                </Form>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-8">Contact Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Mail className="h-5 w-5 text-zim-green mr-3" />
                      <h3 className="font-semibold">Email Us</h3>
                    </div>
                    <a href="mailto:info@zimshipping.co.uk" className="text-zim-green hover:underline">info@zimshipping.co.uk</a>
                    <p className="text-sm text-gray-500 mt-2">For general inquiries</p>
                    
                    <a href="mailto:support@zimshipping.co.uk" className="text-zim-green hover:underline block mt-4">support@zimshipping.co.uk</a>
                    <p className="text-sm text-gray-500 mt-2">For customer support</p>
                  </div>
                  
                  <div className="border rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Phone className="h-5 w-5 text-zim-green mr-3" />
                      <h3 className="font-semibold">Call Us</h3>
                    </div>
                    <a href="tel:+442071234567" className="text-zim-green hover:underline">+44 20 7123 4567</a>
                    <p className="text-sm text-gray-500 mt-2">UK Office</p>
                    
                    <a href="tel:+2634123456" className="text-zim-green hover:underline block mt-4">+263 4 123 456</a>
                    <p className="text-sm text-gray-500 mt-2">Zimbabwe Office</p>
                  </div>
                  
                  <div className="border rounded-lg p-6 md:col-span-2">
                    <div className="flex items-center mb-4">
                      <Clock className="h-5 w-5 text-zim-green mr-3" />
                      <h3 className="font-semibold">Business Hours</h3>
                    </div>
                    <div className="space-y-2">
                      {businessHours.map((item, index) => (
                        <div key={index} className="flex justify-between border-b pb-2 last:border-0">
                          <span className="font-medium">{item.day}</span>
                          <span>{item.hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-6 md:col-span-2">
                    <div className="flex items-center mb-4">
                      <Map className="h-5 w-5 text-zim-green mr-3" />
                      <h3 className="font-semibold">Visit Us</h3>
                    </div>
                    <p>123 Shipping Lane</p>
                    <p>Birmingham, B1 1AA</p>
                    <p>United Kingdom</p>
                    
                    <div className="mt-4 aspect-video w-full bg-gray-200 rounded">
                      <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2429.582678377326!2d-1.9006004!3d52.4796769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4870bc8d5e66b11b%3A0x9ae4b262f154be05!2sBirmingham%20City%20Centre%2C%20Birmingham!5e0!3m2!1sen!2suk!4v1656603488149!5m2!1sen!2suk" 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen={true} 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Office Location"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
