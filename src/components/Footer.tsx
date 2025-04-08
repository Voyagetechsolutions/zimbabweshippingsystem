
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8 w-full">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-4 text-gray-400 max-w-xs">
              Connecting Zimbabwe to the UK with reliable shipping solutions since 2020.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="https://www.facebook.com/bulawayo.shipping" className="text-gray-400 hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
          
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-400 hover:text-white transition-colors">Services</Link>
              </li>
              <li>
               <Link to="/pricing">
              <span className="text-gray-500 hover:text-gray-400 text-sm">Pricing</span>
            </Link>
                </li>
              <li>
                <Link to="/track" className="text-gray-400 hover:text-white transition-colors">Track Shipment</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/book-shipment" className="text-gray-400 hover:text-white transition-colors">Book a Shipment</Link>
              </li>
              <li>
                <Link to="/gallery" className="text-gray-400 hover:text-white transition-colors">Gallery</Link>
              </li>
              <li>
                <Link to="/reviews" className="text-gray-400 hover:text-white transition-colors">Reviews</Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">My Account</Link>
              </li>
              <li>
                <Link to="/auth" className="text-gray-400 hover:text-white transition-colors">Login / Register</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-zim-green mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-300">UK Office:</p>
                  <p className="text-gray-400">
                    Pastures Lodge Farm, Raunds Road<br />
                    Chelveston, Wellingborough<br />
                    Northamptonshire, England<br />
                    NN9 6AA
                  </p>
                </div>
              </li>
              <li className="flex">
                <Phone className="h-5 w-5 text-zim-green mr-2 flex-shrink-0" />
                <span className="text-gray-400">+44 7584 100552 (UK)</span>
              </li>
              <li className="flex">
                <Mail className="h-5 w-5 text-zim-green mr-2 flex-shrink-0" />
                <span className="text-gray-400">info@zimshipping.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} UK to Zimbabwe Shipping. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Link to="/pricing">
              <span className="text-gray-500 hover:text-gray-400 text-sm">Pricing</span>
            </Link>
            <Link to="/privacy">
              <span className="text-gray-500 hover:text-gray-400 text-sm">Privacy Policy</span>
            </Link>
            <Link to="/terms">
              <span className="text-gray-500 hover:text-gray-400 text-sm">Terms of Service</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
