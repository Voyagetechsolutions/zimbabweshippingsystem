
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, Package, Book, Search, PackageCheck } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Navigation links - both for desktop and mobile
  const navLinks = [
    { name: 'Services', path: '/services', icon: <Package className="h-4 w-4 mr-2" /> },
    { name: 'Pricing', path: '/pricing', icon: <Book className="h-4 w-4 mr-2" /> },
    { name: 'Track', path: '/track', icon: <Search className="h-4 w-4 mr-2" /> },
    { name: 'Contact', path: '/contact', icon: <User className="h-4 w-4 mr-2" /> },
  ];

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm dark:bg-gray-900/95' : 'bg-white dark:bg-gray-900'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <Logo size="small" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-zim-green ${
                  location.pathname === link.path
                    ? 'text-zim-green font-semibold'
                    : 'text-gray-600 dark:text-gray-200'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Book Shipment Button */}
            <Link to="/book-shipment">
              <Button className="hidden md:flex items-center bg-zim-red hover:bg-zim-red/90 text-white">
                <PackageCheck className="h-4 w-4 mr-2" />
                Book Shipment
              </Button>
            </Link>
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* User Menu (if authenticated) */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/dashboard">
                    <DropdownMenuItem>Dashboard</DropdownMenuItem>
                  </Link>
                  <Link to="/account">
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="hidden md:inline-flex">
                  Sign In
                </Button>
              </Link>
            )}
            
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 p-0 md:hidden">
                  <span className="sr-only">Toggle Menu</span>
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <div className="flex flex-col h-full">
                  <div className="pt-6 pb-8">
                    <Logo size="small" />
                  </div>
                  <nav className="flex flex-col space-y-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                          location.pathname === link.path
                            ? 'bg-gray-100 text-zim-green dark:bg-gray-800'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={closeMobileMenu}
                      >
                        {link.icon}
                        {link.name}
                      </Link>
                    ))}
                    <Link
                      to="/book-shipment"
                      className="flex items-center py-2 px-3 rounded-md text-sm font-medium bg-zim-red text-white"
                      onClick={closeMobileMenu}
                    >
                      <PackageCheck className="h-4 w-4 mr-2" />
                      Book Shipment
                    </Link>
                    {!isAuthenticated && (
                      <Link
                        to="/auth"
                        className="flex items-center py-2 px-3 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-700"
                        onClick={closeMobileMenu}
                      >
                        Sign In
                      </Link>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
