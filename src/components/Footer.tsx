
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png" 
                alt="Zimbabwe Shipping Logo" 
                className="h-12 w-auto mr-3"
                width="48"
                height="48"
                loading="lazy"
              />
              <h3 className="text-xl font-bold">Zimbabwe Shipping</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Your trusted shipping partner from the UK to Zimbabwe. Fast, secure, and reliable shipping services.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Twitter className="h-6 w-6" />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 border-b-2 border-zim-red pb-2 inline-block">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-zim-yellow transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-300 hover:text-zim-yellow transition-colors">Services</Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-300 hover:text-zim-yellow transition-colors">Pricing</Link>
              </li>
              <li>
                <Link to="/track" className="text-gray-300 hover:text-zim-yellow transition-colors">Track Shipment</Link>
              </li>
              <li>
                <Link to="/book-shipment" className="text-gray-300 hover:text-zim-yellow transition-colors">Book Shipment</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-zim-yellow transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>
          
          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-4 border-b-2 border-zim-yellow pb-2 inline-block">Our Services</h3>
            <ul className="space-y-2">
              <li className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Link to="/services">Drum Shipping</Link>
              </li>
              <li className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Link to="/services">Parcel Delivery</Link>
              </li>
              <li className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Link to="/services">Door-to-Door Delivery</Link>
              </li>
              <li className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Link to="/services">Customs Clearance</Link>
              </li>
              <li className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Link to="/services">Commercial Shipping</Link>
              </li>
              <li className="text-gray-300 hover:text-zim-yellow transition-colors">
                <Link to="/services">Express Shipping</Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 border-b-2 border-zim-green pb-2 inline-block">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-zim-red mr-2 mt-0.5" />
                <span className="text-gray-300">
                  Pastures Lodge Farm, Raunds Road<br />
                  Chelveston, Wellingborough, NN9 6AA
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-zim-yellow mr-2" />
                <a href="tel:+447584100552" className="text-gray-300 hover:text-zim-yellow transition-colors">
                  +44 7584 100552
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-zim-green mr-2" />
                <a href="mailto:info@zimbabweshipping.com" className="text-gray-300 hover:text-zim-yellow transition-colors">
                  info@zimbabweshipping.com
                </a>
              </li>
              <li className="mt-4">
                <a 
                  href="https://wa.me/447584100552" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  Chat on WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              &copy; {currentYear} Zimbabwe Shipping. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link to="/terms" className="text-gray-400 hover:text-zim-yellow transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-gray-400 hover:text-zim-yellow transition-colors">
                Privacy Policy
              </Link>
              <Link to="/faq" className="text-gray-400 hover:text-zim-yellow transition-colors">
                FAQ
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-500 text-sm">
            <p>Developed by Voyatech</p>
          </div>
        </div>
      </div>
      
      {/* Zimbabwe Flag Colors Strip */}
      <div className="w-full flex h-2">
        <div className="w-1/3 bg-zim-green"></div>
        <div className="w-1/3 bg-zim-yellow"></div>
        <div className="w-1/3 bg-zim-red"></div>
      </div>
    </footer>
  );
};

export default Footer;
