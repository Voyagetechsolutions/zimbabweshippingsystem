
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, Ship, Package, Phone, User, LogIn } from 'lucide-react';
import Logo from './Logo';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { name: "Services", href: "/services", icon: <Ship className="w-5 h-5" /> },
    { name: "Track Shipment", href: "/track", icon: <Package className="w-5 h-5" /> },
    { name: "Contact", href: "/contact", icon: <Phone className="w-5 h-5" /> },
  ];

  return (
    <nav className="bg-white shadow-md w-full z-50 sticky top-0">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <Link to="/">
              <Logo />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="flex items-center text-sm text-gray-700 hover:text-zim-green font-medium py-2 transition duration-150 ease-in-out"
                >
                  {link.icon}
                  <span className="ml-1">{link.name}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" className="border-zim-black flex items-center">
                <LogIn className="mr-1 h-4 w-4" />
                Sign In
              </Button>
              <Button className="bg-zim-green hover:bg-zim-green/90 flex items-center">
                <User className="mr-1 h-4 w-4" />
                Register
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-zim-green focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg py-2">
          <div className="container mx-auto px-4 flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="flex items-center text-gray-700 hover:text-zim-green font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="mr-3">{link.icon}</span>
                {link.name}
              </Link>
            ))}
            <div className="py-3 space-y-3">
              <Button variant="outline" className="w-full border-zim-black flex items-center justify-center">
                <LogIn className="mr-1 h-4 w-4" />
                Sign In
              </Button>
              <Button className="w-full bg-zim-green hover:bg-zim-green/90 flex items-center justify-center">
                <User className="mr-1 h-4 w-4" />
                Register
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
