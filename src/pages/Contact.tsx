
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Contact Us
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Get in touch with our team for inquiries, quotes, or support
              </p>
              <div className="flex justify-center mt-6">
                <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="w-12 h-12 rounded-full bg-zim-red/10 flex items-center justify-center mr-4">
                        <MapPin className="h-6 w-6 text-zim-red" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Office Address</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          Pastures Lodge Farm, Raunds Road<br />
                          Chelveston, Wellingborough<br />
                          Northamptonshire, NN9 6AA
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-12 h-12 rounded-full bg-zim-yellow/10 flex items-center justify-center mr-4">
                        <Phone className="h-6 w-6 text-zim-yellow" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Phone Number</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          <a href="tel:+447584100552" className="hover:text-zim-yellow transition-colors">
                            +44 7584 100552
                          </a>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-12 h-12 rounded-full bg-zim-green/10 flex items-center justify-center mr-4">
                        <Mail className="h-6 w-6 text-zim-green" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Email Address</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          <a href="mailto:info@zimbabweshipping.com" className="hover:text-zim-green transition-colors">
                            info@zimbabweshipping.com
                          </a>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center mr-4">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">WhatsApp Support</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          <a 
                            href="https://wa.me/447584100552" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-green-600 transition-colors"
                          >
                            +44 7584 100552
                          </a>
                        </p>
                        <a 
                          href="https://wa.me/447584100552" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md mt-2"
                        >
                          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                          Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Business Hours Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Business Hours</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Monday - Friday</span>
                      <span>9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Saturday</span>
                      <span>10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Sunday</span>
                      <span>Closed</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-300">
                      For urgent matters outside business hours, please use our WhatsApp support or email us.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Map Section */}
            <div className="mt-12 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Find Us</h2>
                  <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2446.7928200121245!2d-0.5945484225804939!3d52.17811917131576!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4877c7e1c1053197%3A0x5e5adf2b8c2f02ad!2sPastures%20Lodge%20Farm%2C%20Raunds%20Rd%2C%20Chelveston%2C%20Wellingborough%20NN9%206AA!5e0!3m2!1sen!2suk!4v1712389542800!5m2!1sen!2suk" 
                      width="100%" 
                      height="450" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Zimbabwe Shipping Location Map"
                    ></iframe>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button asChild className="bg-zim-green hover:bg-zim-green/90">
                      <a 
                        href="https://goo.gl/maps/h7N7TK3vGQjDWUBh9" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Get Directions
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
