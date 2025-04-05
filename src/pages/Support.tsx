
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SupportTicketForm from '@/components/SupportTicketForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessagesSquare, Phone, Mail, Clock } from 'lucide-react';

const Support = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <section className="py-12 bg-zim-green/10">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Customer Support</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We're here to help with any questions about your shipments between the UK and Zimbabwe.
            </p>
          </div>
        </section>
        
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div>
                <h2 className="text-2xl font-bold mb-6">Submit a Support Ticket</h2>
                <p className="text-gray-600 mb-6">
                  Fill out the form below to create a support ticket. Our team will respond to your inquiry as soon as possible.
                </p>
                <SupportTicketForm />
              </div>
              
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Phone className="mr-2 h-5 w-5 text-zim-green" />
                      Phone Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">UK Phone: +44 7123 456789</p>
                    <p className="text-gray-600">Zimbabwe Phone: +263 771 234567</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Mail className="mr-2 h-5 w-5 text-zim-green" />
                      Email Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">General Inquiries: info@zimshipping.com</p>
                    <p className="text-gray-600">Support: support@zimshipping.com</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Clock className="mr-2 h-5 w-5 text-zim-green" />
                      Support Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">Monday to Friday: 9am - 5pm (UK Time)</p>
                    <p className="text-gray-600">Saturday: 9am - 1pm (UK Time)</p>
                    <p className="text-gray-600">Sunday: Closed</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <MessagesSquare className="mr-2 h-5 w-5 text-zim-green" />
                      FAQ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium">How long does shipping take?</h3>
                      <p className="text-gray-600 text-sm">Standard shipping takes approximately 3-4 weeks from the UK to Zimbabwe.</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Can I track my shipment?</h3>
                      <p className="text-gray-600 text-sm">Yes, you can track your shipment using the tracking number provided after booking.</p>
                    </div>
                    <div>
                      <h3 className="font-medium">What items can't be shipped?</h3>
                      <p className="text-gray-600 text-sm">Prohibited items include perishables, weapons, and hazardous materials.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Support;
