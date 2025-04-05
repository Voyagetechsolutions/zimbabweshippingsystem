
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import WhatsAppButton from '@/components/WhatsAppButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Contact = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, subject: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Determine priority based on subject
      let priority = 'Medium';
      if (formData.subject === 'complaint' || formData.subject === 'support') {
        priority = 'High';
      } else if (formData.subject === 'feedback') {
        priority = 'Low';
      }
      
      // Create support ticket
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000', // Anonymous or user ID
          subject: formData.subject === 'general' 
            ? `General Inquiry from ${formData.name}`
            : `${formData.subject.charAt(0).toUpperCase() + formData.subject.slice(1)} from ${formData.name}`,
          message: `Email: ${formData.email}\n\n${formData.message}`,
          status: 'Open',
          priority: priority,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('Support ticket created:', data);
      
      setIsSubmitted(true);
      
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
      });

      // Reset form after submission
      setFormData({
        name: '',
        email: '',
        subject: 'general',
        message: '',
      });
      
      // Reset submitted state after 3 seconds
      setTimeout(() => setIsSubmitted(false), 3000);
      
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      toast({
        title: "Error submitting form",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const businessHours = [
    { day: 'Monday', hours: '7:00 AM - 6:00 PM' },
    { day: 'Tuesday', hours: '7:00 AM - 6:00 PM' },
    { day: 'Wednesday', hours: '7:00 AM - 6:00 PM' },
    { day: 'Thursday', hours: '7:00 AM - 6:00 PM' },
    { day: 'Friday', hours: '7:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '8:00 AM - 4:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ];

  const contactInfo = [
    { 
      icon: <Phone className="h-5 w-5 text-zim-green" />, 
      title: 'Phone',
      details: ['+44 7584 100552', '+263 772 123456'],
      action: { label: 'Call Us', href: 'tel:+447584100552' }
    },
    { 
      icon: <Mail className="h-5 w-5 text-zim-yellow" />, 
      title: 'Email',
      details: ['info@zimbabweshipping.com', 'support@zimbabweshipping.com'],
      action: { label: 'Email Us', href: 'mailto:info@zimbabweshipping.com' }
    },
    { 
      icon: <MapPin className="h-5 w-5 text-zim-red" />, 
      title: 'Office',
      details: ['Pastures Lodge Farm, Raunds Road', 'Chelveston, Wellingborough, NN9 6AA'],
      action: { label: 'Get Directions', href: 'https://maps.google.com' }
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-zim-green/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Have questions or need assistance with your shipment? Get in touch with our friendly team.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center p-6">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Received!</h3>
                    <p className="text-gray-600">
                      Thank you for contacting us. Our team will get back to you as soon as possible.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Select 
                        value={formData.subject} 
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger id="subject">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="shipping">Shipping Question</SelectItem>
                          <SelectItem value="tracking">Tracking Issue</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        name="message" 
                        placeholder="Enter your message here" 
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-zim-green hover:bg-zim-green/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Send className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex">
                    <div className="bg-gray-100 p-3 rounded-full self-start mr-4">
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{info.title}</h3>
                      {info.details.map((detail, i) => (
                        <p key={i} className="text-gray-600">{detail}</p>
                      ))}
                      <a 
                        href={info.action.href} 
                        className="text-zim-green hover:underline mt-2 inline-block"
                      >
                        {info.action.label}
                      </a>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessHours.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div className="font-medium">{item.day}</div>
                      <div className={item.hours === 'Closed' ? 'text-red-500' : 'text-gray-600'}>
                        {item.hours}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Contact;
