
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, Shield, Settings, Package, Bell, Truck, DollarSign, Image, Search, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get the display name - prioritize full name, then email username
  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    if (user?.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  };

  // Get the role display name (capitalized)
  const getRoleDisplay = () => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              {isMobile ? (
                <img src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png" alt="Logo" className="h-10 w-auto" />
              ) : (
                <Logo />
              )}
            </Link>
            <div className="hidden md:block ml-6">
              <div className="flex items-baseline space-x-3">
                <Link
                  to="/services"
                  className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <FileText className="mr-1 h-4 w-4" />
                  <span>Services</span>
                </Link>
                <Link
                  to="/pricing"
                  className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <DollarSign className="mr-1 h-4 w-4" />
                  <span>Pricing</span>
                </Link>
                <Link
                  to="/gallery"
                  className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Image className="mr-1 h-4 w-4" />
                  <span>Gallery</span>
                </Link>
                <Link
                  to="/track"
                  className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Search className="mr-1 h-4 w-4" />
                  <span>Track</span>
                </Link>
                <Link
                  to="/contact"
                  className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Phone className="mr-1 h-4 w-4" />
                  <span>Contact</span>
                </Link>
                <Link
                  to="/book-shipment"
                  className="bg-red-600 text-white hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Truck className="mr-1 h-4 w-4" />
                  <span>Book Shipment</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="flex items-center justify-center h-full w-full bg-zim-green/10 text-zim-green rounded-full">
                      {getDisplayName().charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs leading-none text-gray-500">{user.email}</p>
                      {role && (
                        <p className="text-xs leading-none text-zim-green mt-1">{getRoleDisplay()}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <Package className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>My Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/notifications')}>
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                    </DropdownMenuItem>
                    {(isAdmin || role === 'admin') && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button className="bg-zim-green hover:bg-zim-green/90" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
          <div className="md:hidden flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="flex items-center justify-center h-full w-full bg-zim-green/10 text-zim-green rounded-full">
                      {getDisplayName().charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs leading-none text-gray-500">{user.email}</p>
                      {role && (
                        <p className="text-xs leading-none text-zim-green mt-1">{getRoleDisplay()}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <Package className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    {(isAdmin || role === 'admin') && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button className="bg-zim-green hover:bg-zim-green/90" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zim-green"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link
            to="/services"
            className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center"
            onClick={toggleMenu}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Services</span>
          </Link>
          <Link
            to="/pricing"
            className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center"
            onClick={toggleMenu}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            <span>Pricing</span>
          </Link>
          <Link
            to="/gallery"
            className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center"
            onClick={toggleMenu}
          >
            <Image className="mr-2 h-4 w-4" />
            <span>Gallery</span>
          </Link>
          <Link
            to="/track"
            className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center"
            onClick={toggleMenu}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Track</span>
          </Link>
          <Link
            to="/contact"
            className="text-gray-600 dark:text-gray-300 hover:text-zim-green dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center"
            onClick={toggleMenu}
          >
            <Phone className="mr-2 h-4 w-4" />
            <span>Contact</span>
          </Link>
          <Link
            to="/book-shipment"
            className="bg-red-600 text-white hover:bg-red-700 block px-3 py-2 rounded-md text-base font-medium flex items-center"
            onClick={toggleMenu}
          >
            <Truck className="mr-2 h-4 w-4" />
            <span>Book Shipment</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
