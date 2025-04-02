
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, Ship, Package, Phone, User, LogIn, LogOut, Settings, Package2, BookOpen } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '@/contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { name: "Services", href: "/services", icon: <Ship className="w-5 h-5" /> },
    { name: "Book Your Shipment", href: "/book-shipment", icon: <BookOpen className="w-5 h-5" /> },
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
              {user ? (
                <>
                  <div className="group relative">
                    <Button variant="outline" className="border-zim-black flex items-center">
                      <User className="mr-1 h-4 w-4" />
                      My Account
                    </Button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20 invisible group-hover:visible">
                      <div className="py-2">
                        <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <Package2 className="inline-block mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link to="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <Settings className="inline-block mr-2 h-4 w-4" />
                          Account Settings
                        </Link>
                        {/* Admin link - in a real app, check for admin role */}
                        <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <Package className="inline-block mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                        <button 
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogOut className="inline-block mr-2 h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                  <Link to="/create-shipment">
                    <Button 
                      className="bg-zim-green hover:bg-zim-green/90 flex items-center"
                    >
                      <Package className="mr-1 h-4 w-4" />
                      New Shipment
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" className="border-zim-black flex items-center">
                      <LogIn className="mr-1 h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-zim-green hover:bg-zim-green/90 flex items-center" onClick={() => navigate('/auth', { state: { signup: true } })}>
                      <User className="mr-1 h-4 w-4" />
                      Register
                    </Button>
                  </Link>
                </>
              )}
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
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-zim-black flex items-center justify-center">
                      <Package2 className="mr-1 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/account" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-zim-black flex items-center justify-center">
                      <Settings className="mr-1 h-4 w-4" />
                      Account Settings
                    </Button>
                  </Link>
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-zim-black flex items-center justify-center">
                      <Package className="mr-1 h-4 w-4" />
                      Admin Dashboard
                    </Button>
                  </Link>
                  <Link to="/create-shipment" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-zim-green hover:bg-zim-green/90 flex items-center justify-center">
                      <Package className="mr-1 h-4 w-4" />
                      New Shipment
                    </Button>
                  </Link>
                  <Button 
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center"
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-zim-black flex items-center justify-center">
                      <LogIn className="mr-1 h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => {
                    navigate('/auth', { state: { signup: true } });
                    setIsMenuOpen(false);
                  }}>
                    <Button className="w-full bg-zim-green hover:bg-zim-green/90 flex items-center justify-center">
                      <User className="mr-1 h-4 w-4" />
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
