import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import Logo from '@/components/Logo';

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center">
              <Logo />
            </Link>
            
            <div className="hidden md:flex space-x-6">
              <Link 
                to="/" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Home
              </Link>
              <Link 
                to="/services" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/services' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Services
              </Link>
              <Link 
                to="/pricing" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/pricing' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Pricing
              </Link>
              <Link 
                to="/track" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/track' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Track
              </Link>
              <Link 
                to="/gallery" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/gallery' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Gallery
              </Link>
              <Link 
                to="/blog" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/blog' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Blog
              </Link>
              <Link 
                to="/contact" 
                className={`text-gray-700 hover:text-zim-green transition-colors ${
                  location.pathname === '/contact' ? 'text-zim-green font-medium' : ''
                }`}
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Sign Up</Button>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className='md:hidden' />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-xs">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    See all available options
                  </SheetDescription>
                </SheetHeader>
                <div className="px-2 pt-2 pb-3 space-y-1">
                  <Link
                    to="/"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/'
                      ? 'text-zim-green bg-gray-100'
                      : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/services"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/services'
                      ? 'text-zim-green bg-gray-100'
                      : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Services
                  </Link>
                  <Link
                    to="/pricing"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/pricing'
                      ? 'text-zim-green bg-gray-100'
                      : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/track"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/track'
                      ? 'text-zim-green bg-gray-100'
                      : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Track
                  </Link>
                  <Link
                    to="/gallery"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/gallery'
                      ? 'text-zim-green bg-gray-100'
                      : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Gallery
                  </Link>
                  <Link 
                    to="/blog" 
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      location.pathname === '/blog' 
                        ? 'text-zim-green bg-gray-100' 
                        : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Blog
                  </Link>
                  <Link
                    to="/contact"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/contact'
                      ? 'text-zim-green bg-gray-100'
                      : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  <Link to="/auth">
                    <Button variant="outline" size="sm">Login</Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link 
              to="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/services" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/services' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Services
            </Link>
            <Link 
              to="/pricing" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/pricing' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/track" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/track' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Track
            </Link>
            <Link 
              to="/gallery" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/gallery' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Gallery
            </Link>
            <Link 
              to="/blog" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/blog' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>
            <Link 
              to="/contact" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/contact' 
                  ? 'text-zim-green bg-gray-100' 
                  : 'text-gray-700 hover:text-zim-green hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            
            <Link to="/auth">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
