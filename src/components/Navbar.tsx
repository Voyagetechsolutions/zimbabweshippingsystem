
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import CurrencySwitcher from './CurrencySwitcher';
import { useRole } from '@/contexts/RoleContext';
import NotificationsPanel from './NotificationsPanel';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from '@/lib/utils';
import { Menu, X, User, LogOut, Settings, LayoutDashboard, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const Navbar = () => {
  const { session, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useRole();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const isAdmin = hasPermission('admin');
  
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center px-4">
        {/* Logo section */}
        <div className="flex items-center mr-4">
          <Link to="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-auto" />
            {!isMobile && (
              <span className={cn(
                "font-bold tracking-tight hidden sm:inline-block",
                isDarkMode ? "text-white" : "text-black"
              )}>
                Zimbabwe Shipping UK to Zimbabwe Express.
              </span>
            )}
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden ml-auto">
          {session && (
            <>
              <NotificationsPanel className="mr-2" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/dashboard">
                    <DropdownMenuItem>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/account">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin">
                      <DropdownMenuItem>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          <Button
            variant="ghost"
            className="ml-2"
            size="icon"
            aria-label="Toggle Menu"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Desktop navigation */}
        <nav className={cn(
          "hidden md:flex items-center space-x-1 md:space-x-2 lg:space-x-4 ml-auto",
        )}>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Services</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 w-[400px] md:w-[500px] lg:w-[600px] grid-cols-2">
                    <li>
                      <Link 
                        to="/services#shipping-drums" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Shipping Drums</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Ship your goods in our secure 200L metal drums
                        </p>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/services#door-to-door" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Door-to-Door Delivery</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          We pick up from your door in the UK and deliver to Zimbabwe
                        </p>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/services#car-shipping" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Vehicle Shipping</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Ship your car from the UK to Zimbabwe hassle-free
                        </p>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/services#commercial" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Commercial Shipping</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Specialized services for businesses and organizations
                        </p>
                      </Link>
                    </li>
                    <li className="col-span-2">
                      <Link 
                        to="/services" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="flex items-center justify-between text-sm font-medium leading-none">
                          <span>View All Services</span>
                          <span>&rarr;</span>
                        </div>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link to="/pricing" className={navigationMenuTriggerStyle()}>
                  Pricing
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link to="/track" className={navigationMenuTriggerStyle()}>
                  Track Shipment
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Support</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[250px] gap-3 p-4">
                    <li>
                      <Link 
                        to="/faq" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">FAQ</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Frequently asked questions about our services
                        </p>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/contact" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Contact Us</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Reach out to our team for assistance
                        </p>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/support" 
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Support Center</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Submit a ticket or check the status of your request
                        </p>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Action buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <CurrencySwitcher />
            <ThemeToggle />
            
            {session ? (
              <div className="flex items-center space-x-2">
                <NotificationsPanel />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-full">
                      <User className="h-5 w-5 mr-2" />
                      <span className="hidden lg:inline">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link to="/dashboard">
                      <DropdownMenuItem>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link to="/account">
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </DropdownMenuItem>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin">
                        <DropdownMenuItem>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth">
                  <Button variant="secondary" size="sm">Sign in</Button>
                </Link>
                <Link to="/book-shipment">
                  <Button size="sm" className="bg-zim-green hover:bg-zim-green/90">Book Now</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile navigation menu */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-background/95 backdrop-blur">
          <nav className="container px-4 py-6 h-full flex flex-col">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/services" 
                className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Services
              </Link>
              <Link 
                to="/pricing" 
                className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/track" 
                className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Track Shipment
              </Link>
              <Link 
                to="/faq" 
                className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </Link>
              <Link 
                to="/contact" 
                className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="text-lg font-medium py-2 border-b border-gray-200 dark:border-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
            </div>
            
            <div className="mt-auto space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <ThemeToggle />
                  <CurrencySwitcher />
                </div>
                
                {!session ? (
                  <div className="flex flex-col space-y-2">
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">Sign in</Button>
                    </Link>
                    <Link to="/book-shipment" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-zim-green hover:bg-zim-green/90">Book Now</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">Dashboard</Button>
                    </Link>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => {
                        handleSignOut();
                        setIsOpen(false);
                      }}
                    >
                      Sign out
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
