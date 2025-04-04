
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import ThemeToggle from '@/components/ThemeToggle';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Menu,
  LogOut,
  User,
  ShieldCheck,
  Bell,
  Package,
  Phone,
  Search,
  MapPin,
  Truck,
  LogIn,
  UserPlus,
  DollarSign,
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button"
import NotificationsPanel from '@/components/NotificationsPanel';

const Navbar = () => {
  const { user, session, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Get user's full name from profile or fallback to email
  const displayName = user?.user_metadata?.full_name || user?.email;

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png" alt="Zimbabwe Shipping" className="h-8 mr-2" />
          <div>
            <h1 className="text-xl font-bold text-zim-black dark:text-white">Zimbabwe Shipping</h1>
            <p className="text-xs text-zim-black/70 dark:text-gray-300">UK to Zimbabwe</p>
          </div>
        </Link>

        {isMobile ? (
          // Mobile Menu
          <>
            <div className="flex items-center gap-2">
              <CurrencySwitcher />
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>

            {isMenuOpen && (
              <div className="absolute top-full right-0 bg-white dark:bg-gray-800 shadow-md rounded-md p-4 w-48 z-50">
                <Link to="/book-shipment" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Truck className="mr-2 h-4 w-4" />
                  Book Shipment
                </Link>
                <Link to="/services" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Package className="mr-2 h-4 w-4" />
                  Services
                </Link>
                <Link to="/pricing" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pricing
                </Link>
                <Link to="/gallery" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Image className="mr-2 h-4 w-4" />
                  Gallery
                </Link>
                <Link to="/contact" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Phone className="mr-2 h-4 w-4" />
                  Contact
                </Link>
                <Link to="/track" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Search className="mr-2 h-4 w-4" />
                  Track
                </Link>
                {user ? (
                  <>
                    <Link to="/dashboard" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link to="/account" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    )}
                    <button onClick={handleLogout} className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md w-full text-left">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Link>
                    <Link to="/auth" state={{ signup: true }} className="flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register
                    </Link>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          // Desktop Menu
          <div className="flex items-center space-x-6">
            <Link to="/book-shipment" className="flex items-center hover:text-gray-600 dark:text-gray-200 dark:hover:text-white">
              <Truck className="mr-1 h-4 w-4" />
              Book Shipment
            </Link>
            <Link to="/services" className="flex items-center hover:text-gray-600 dark:text-gray-200 dark:hover:text-white">
              <Package className="mr-1 h-4 w-4" />
              Services
            </Link>
            <Link to="/pricing" className="flex items-center hover:text-gray-600 dark:text-gray-200 dark:hover:text-white">
              <DollarSign className="mr-1 h-4 w-4" />
              Pricing
            </Link>
            <Link to="/gallery" className="flex items-center hover:text-gray-600 dark:text-gray-200 dark:hover:text-white">
              <Image className="mr-1 h-4 w-4" />
              Gallery
            </Link>
            <Link to="/contact" className="flex items-center hover:text-gray-600 dark:text-gray-200 dark:hover:text-white">
              <Phone className="mr-1 h-4 w-4" />
              Contact
            </Link>
            <Link to="/track" className="flex items-center hover:text-gray-600 dark:text-gray-200 dark:hover:text-white">
              <Search className="mr-1 h-4 w-4" />
              Track
            </Link>
            
            <div className="flex items-center space-x-2">
              <CurrencySwitcher />
              <ThemeToggle />
            </div>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative dark:text-white">
                    <User className="mr-2 h-4 w-4" />
                    {displayName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuLabel className="dark:text-white">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                    <Link to="/account" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                    <Link to="/notifications" className="cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                    <Link to="/address-book" className="cursor-pointer">
                      <MapPin className="mr-2 h-4 w-4" />
                      Address Book
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="dark:bg-gray-700" />
                      <DropdownMenuLabel className="dark:text-white">Administration</DropdownMenuLabel>
                      <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                        <Link to="/admin" className="cursor-pointer">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                        <Link to="/admin/gallery" className="cursor-pointer">
                          <Image className="mr-2 h-4 w-4" />
                          Gallery Management
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth" className="flex items-center text-zim-green dark:text-zim-yellow hover:text-zim-green/90 dark:hover:text-zim-yellow/90">
                  <LogIn className="mr-1 h-4 w-4" />
                  Sign In
                </Link>
                <Link to="/auth" state={{ signup: true }} className="flex items-center bg-zim-green text-white px-4 py-2 rounded-md hover:bg-zim-green/90">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
