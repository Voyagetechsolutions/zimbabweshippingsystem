
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, User, ShoppingBag, LogOut, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRole } from '@/contexts/RoleContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { hasPermission } = useRole();
  const { resolvedTheme } = useTheme();
  
  const isAdmin = hasPermission('admin');

  const handleReviewsClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      
      const reviewsSection = document.querySelector('.reviews-section');
      if (reviewsSection) {
        reviewsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled 
          ? resolvedTheme === 'dark' 
            ? "bg-gray-900 shadow-lg shadow-black/20" 
            : "bg-white shadow-md" 
          : resolvedTheme === 'dark' 
            ? "bg-gray-900/80 backdrop-blur-sm" 
            : "bg-white/80 backdrop-blur-sm"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo section */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <Logo className="h-8 w-auto" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/services">
                      Services
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Shipping</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/pricing"
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            )}
                          >
                            <div className="text-sm font-medium leading-none">Pricing</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              View our transparent pricing structure for shipping from UK to Zimbabwe
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/collection-schedule"
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            )}
                          >
                            <div className="text-sm font-medium leading-none">Collection Schedule</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Check when we're collecting in your area
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/track"
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            )}
                          >
                            <div className="text-sm font-medium leading-none">Track Shipment</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Track the status of your shipment in real-time
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link to="/book-shipment"
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            )}
                          >
                            <div className="text-sm font-medium leading-none">Book a Shipment</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Schedule a new shipment to Zimbabwe
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                {/*<NavigationMenuItem>  //First update the gallery features
                  <Link to="/gallery">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Gallery
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>*/}
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/" onClick={handleReviewsClick}>
                      Reviews
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/contact">
                      Contact
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/about-us">
                      About Us
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link to="/book-shipment">
                    <Button className="bg-zim-red hover:bg-zim-red/90 text-white">
                      Book Shipment
                    </Button>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Desktop account section */}
          <div className="hidden md:flex items-center">
            {/* ThemeToggle component */}
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative ml-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    <span className="max-w-[100px] truncate">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/dashboard">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/account">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/shipments">
                    <DropdownMenuItem className="cursor-pointer">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      <span>My Shipments</span>
                    </DropdownMenuItem>
                  </Link>
                  
                  {/* Add Switch to Admin option */
                  /*<Link to="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Switch to Admin</span>
                    </DropdownMenuItem>
                  </Link>*/}
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <Link to="/admin">
                        <DropdownMenuItem className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" className="mr-2">Log in</Button>
                </Link>
                <Link to="/auth?signup=true">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {/* ThemeToggle for mobile */}
            <ThemeToggle />
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 ml-2 rounded-md text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zim-green"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-background text-foreground">
          <Link to="/services" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            Services
          </Link>
          <Link to="/pricing" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            Pricing
          </Link>
          <Link to="/track" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            Track Shipment
          </Link>
          <Link to="/book-shipment" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            Book Shipment
          </Link>
          <Link to="/collection-schedule" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            Collection Schedule
          </Link>
          <Link to="/" onClick={(e) => { handleReviewsClick(e); setIsOpen(false); }} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent">
            Reviews
          </Link>
          <Link to="/contact" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            Contact
          </Link>
          <Link to="/about-us" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
            About Us
          </Link>
          
          {user ? (
            <>
              <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
                Dashboard
              </Link>
              <Link to="/account" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
                Profile
              </Link>
              <Link to="/shipments" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
                My Shipments
              </Link>
              
              {/* Add Switch to Admin option in mobile menu */}
              <Link to="/admin" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
                Switch to Admin
              </Link>
              
              {isAdmin && (
                <Link to="/admin" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent" onClick={() => setIsOpen(false)}>
                  Admin Panel
                </Link>
              )}
              
              <button
                onClick={() => { signOut(); setIsOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-5">
                <Link to="/auth" className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-zim-green hover:bg-zim-green-dark" onClick={() => setIsOpen(false)}>
                  Log in
                </Link>
              </div>
              <div className="mt-3 flex items-center px-5">
                <Link to="/auth?signup=true" className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-base font-medium text-foreground bg-background hover:bg-accent" onClick={() => setIsOpen(false)}>
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full flex h-1">
        <div className="w-1/3 bg-zim-green"></div>
        <div className="w-1/3 bg-zim-yellow"></div>
        <div className="w-1/3 bg-zim-red"></div>
      </div>
    </header>
  );
};

export default Navbar;
