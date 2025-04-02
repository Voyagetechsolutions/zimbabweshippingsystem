
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo className="!text-white" />
            <p className="text-sm text-gray-300 mt-4">
              The most reliable and affordable shipping service from UK to Zimbabwe. We deliver your packages with care and efficiency.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-zim-yellow">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-zim-yellow">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-zim-yellow">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-zim-yellow">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-gray-300 hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link to="/services" className="text-sm text-gray-300 hover:text-white transition">Our Services</Link>
              </li>
              <li>
                <Link to="/track" className="text-sm text-gray-300 hover:text-white transition">Track Shipment</Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-gray-300 hover:text-white transition">Contact Us</Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-gray-300 hover:text-white transition">About Us</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-zim-yellow">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 text-zim-yellow" />
                <span className="text-sm text-gray-300">123 Shipping Lane, London, UK</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-zim-yellow" />
                <a href="tel:+447584100552" className="text-sm text-gray-300 hover:text-white">+44 7584 100552</a>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-zim-yellow" />
                <a href="mailto:info@zimbabweshipping.com" className="text-sm text-gray-300 hover:text-white">info@zimbabweshipping.com</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-zim-yellow">Newsletter</h3>
            <p className="text-sm text-gray-300 mb-4">Subscribe to our newsletter for updates and promotions.</p>
            <div className="flex flex-col space-y-3">
              <input
                type="email"
                placeholder="Your email address"
                className="px-4 py-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-zim-yellow"
              />
              <Button className="bg-zim-yellow hover:bg-zim-yellow/90 text-black">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 pt-6 mt-6 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} Zimbabwe Shipping. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
