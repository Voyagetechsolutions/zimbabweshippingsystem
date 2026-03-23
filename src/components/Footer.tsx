import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
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
            <p className="text-gray-400 mb-4 max-w-md">
              Family-run shipping service from the UK to Zimbabwe since 2011.
              Free collection, door-to-door delivery, fully tracked.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/profile.php?id=61565306426707"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-zim-green transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/zimbabwe__shipping/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-zim-green transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://wa.me/447584100552"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-zim-green transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/book" className="text-gray-400 hover:text-white transition-colors">
                  Book Shipment
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-gray-400 hover:text-white transition-colors">
                  Track Shipment
                </Link>
              </li>
              <li>
                <Link to="/collection-schedule" className="text-gray-400 hover:text-white transition-colors">
                  Collection Dates
                </Link>
              </li>
              <li>
                <Link to="/about-us" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-zim-green mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 text-sm">
                  Pastures Lodge Farm<br />
                  Chelveston Rd<br />
                  Wellingborough NN9 6AA
                </span>
              </li>
              <li>
                <a href="tel:+447584100552" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                  <Phone className="h-5 w-5 text-zim-yellow" />
                  +44 7584 100552
                </a>
              </li>
              <li>
                <a href="mailto:info@zimbabweshipping.com" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                  <Mail className="h-5 w-5 text-zim-red" />
                  info@zimbabweshipping.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {currentYear} Zimbabwe Shipping. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/terms" className="text-gray-500 hover:text-white transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Zimbabwe Flag Colors Strip */}
      <div className="w-full flex h-1">
        <div className="w-1/3 bg-zim-green"></div>
        <div className="w-1/3 bg-zim-yellow"></div>
        <div className="w-1/3 bg-zim-red"></div>
      </div>
    </footer>
  );
};

export default Footer;
