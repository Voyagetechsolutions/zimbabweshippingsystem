
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

const Contact = () => {
  const { toast } = useToast();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      console.log('Form submitted:', formData);
      setIsSubmitting(false);
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
    }, 1500);
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
      details: ['123 Shipping Lane', 'London, UK, SW1A 1AA'],
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
                  <div className="py-12 text-center">
                    <div className="flex justify-center">
                      <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold mt-4">Message Sent Successfully!</h3>
                    <p className="text-gray-600 mt-2">
                      Thank you for reaching out. We'll get back to you as soon as possible.
                    </p>
                    <Button 
                      className="mt-6 bg-zim-green hover:bg-zim-green/90"
                      onClick={() => setIsSubmitted(false)}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Your Name</Label>
                        <Input 
                          id="name"
                          name="name"
                          placeholder="Enter your name" 
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email" 
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Select 
                        value={formData.subject} 
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Enquiry</SelectItem>
                          <SelectItem value="quote">Request a Quote</SelectItem>
                          <SelectItem value="tracking">Tracking Assistance</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="message">Your Message</Label>
                      <Textarea 
                        id="message"
                        name="message"
                        placeholder="How can we help you today?" 
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        className="mt-1 min-h-[150px]"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="bg-zim-green hover:bg-zim-green/90 w-full md:w-auto px-8"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : (
                        <>
                          Send Message <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contactInfo.map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 bg-gray-100 p-3 rounded-full">
                        {item.icon}
                      </div>
                      <div className="ml-4">
                        <h3 className="font-bold text-gray-800">{item.title}</h3>
                        {item.details.map((detail, idx) => (
                          <p key={idx} className="text-gray-600">{detail}</p>
                        ))}
                        <a 
                          href={item.action.href} 
                          className="inline-block mt-2 text-zim-green hover:underline text-sm font-medium"
                        >
                          {item.action.label}
                        </a>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              {/* Business Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-zim-green" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {businessHours.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span className="font-medium">{item.day}</span>
                        <span 
                          className={`${
                            item.hours === 'Closed' ? 'text-red-500' : 'text-gray-600'
                          }`}
                        >
                          {item.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Emergency Contact */}
              <div className="bg-zim-yellow/10 border border-zim-yellow/20 rounded-lg p-6 text-center">
                <h3 className="text-lg font-bold mb-2">Urgent Shipment Enquiry?</h3>
                <p className="text-gray-600 mb-4">
                  For urgent assistance with your shipments, please call our dedicated support line:
                </p>
                <a 
                  href="tel:+447584100552" 
                  className="inline-block text-xl font-bold text-zim-green hover:underline"
                >
                  +44 7584 100552
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Map Section */}
      <div className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Find Our Office</h2>
            <p className="text-gray-600">Visit our London office for face-to-face consultations and drop-offs</p>
          </div>
          <div className="h-96 bg-gray-200 rounded-lg overflow-hidden">
            {/* In a real application, you would embed an actual map here */}
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500">Map would be displayed here</p>
            </div>
          </div>
        </div>
      </div>
      
      <WhatsAppButton />
      <Footer />
    </div>
  );
};

export default Contact;
