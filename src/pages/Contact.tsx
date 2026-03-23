import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact Us | Zimbabwe Shipping - Get in Touch</title>
        <meta name="description" content="Contact Zimbabwe Shipping for quotes, bookings, or support. Call +44 7584 100552 or email info@zimbabweshipping.com. WhatsApp available." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              We're here to help with your shipping needs
            </p>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {/* Phone */}
                <a href="tel:+447584100552" className="block">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center hover:shadow-lg transition-shadow h-full">
                    <div className="inline-flex p-4 bg-zim-green/10 rounded-full mb-4">
                      <Phone className="h-6 w-6 text-zim-green" />
                    </div>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Call Us</h3>
                    <p className="text-zim-green font-medium">+44 7584 100552</p>
                  </div>
                </a>

                {/* WhatsApp */}
                <a href="https://wa.me/447584100552" target="_blank" rel="noopener noreferrer" className="block">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center hover:shadow-lg transition-shadow h-full">
                    <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">WhatsApp</h3>
                    <p className="text-green-600 font-medium">Chat Now</p>
                  </div>
                </a>

                {/* Email */}
                <a href="mailto:info@zimbabweshipping.com" className="block">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center hover:shadow-lg transition-shadow h-full">
                    <div className="inline-flex p-4 bg-zim-yellow/10 rounded-full mb-4">
                      <Mail className="h-6 w-6 text-zim-yellow" />
                    </div>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Email</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">info@zimbabweshipping.com</p>
                  </div>
                </a>

                {/* Hours */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center h-full">
                  <div className="inline-flex p-4 bg-zim-red/10 rounded-full mb-4">
                    <Clock className="h-6 w-6 text-zim-red" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Hours</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Mon-Fri: 9am-6pm</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Sat: 10am-4pm</p>
                </div>
              </div>

              {/* Address & Map */}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Our Location</h2>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-zim-red/10 rounded-lg">
                      <MapPin className="h-6 w-6 text-zim-red" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">UK Warehouse</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Pastures Lodge Farm<br />
                        Chelveston Road<br />
                        Wellingborough<br />
                        Northamptonshire<br />
                        NN9 6AA
                      </p>
                    </div>
                  </div>
                  <Button asChild className="bg-zim-green hover:bg-zim-green/90">
                    <a
                      href="https://www.google.com/maps/place/Pastures+Lodge+Farm,+Chelveston+Rd,+Wellingborough+NN9+6AA,+UK"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Get Directions
                    </a>
                  </Button>
                </div>

                <div className="rounded-xl overflow-hidden shadow-lg">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2446.7928200121245!2d-0.5945484225804939!3d52.17811917131576!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4877c7e1c1053197%3A0x5e5adf2b8c2f02ad!2sPastures%20Lodge%20Farm%2C%20Raunds%20Rd%2C%20Chelveston%2C%20Wellingborough%20NN9%206AA!5e0!3m2!1sen!2suk!4v1712389542800!5m2!1sen!2suk"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Zimbabwe Shipping Location"
                  />
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

export default Contact;
