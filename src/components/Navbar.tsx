
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button"
import logo from '@/assets/zim-logo.svg';
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

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="ZIM Integrated Shipping Services Ltd." className="h-8 mr-2" />
          <span className="font-bold text-xl">ZIM Clone</span>
        </Link>

        {isMobile ? (
          // Mobile Menu
          <>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-6 w-6" />
            </Button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 bg-white shadow-md rounded-md p-4 w-48 z-50">
                {user ? (
                  <>
                    <Link to="/dashboard" className="block py-2 hover:bg-gray-100 rounded-md">Dashboard</Link>
                    <Link to="/account" className="block py-2 hover:bg-gray-100 rounded-md">Account</Link>
                    {isAdmin && (
                      <Link to="/admin" className="block py-2 hover:bg-gray-100 rounded-md">Admin</Link>
                    )}
                    <button onClick={handleLogout} className="block py-2 hover:bg-gray-100 rounded-md w-full text-left">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="block py-2 hover:bg-gray-100 rounded-md">Login/Register</Link>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          // Desktop Menu
          <div className="flex items-center space-x-6">
            <Link to="/services" className="hover:text-gray-600">Services</Link>
            <Link to="/contact" className="hover:text-gray-600">Contact</Link>
            <Link to="/track" className="hover:text-gray-600">Track</Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative">
                    {user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/notifications" className="cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth" className="bg-zim-green text-white px-4 py-2 rounded-md hover:bg-zim-green/90">
                Login/Register
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
