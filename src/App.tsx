
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleProvider } from '@/contexts/RoleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ShippingProvider } from '@/contexts/ShippingContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RouteGuard } from '@/components/RouteGuard';

// Import pages
import Index from '@/pages/Index';
import BookShipment from '@/pages/BookShipment';
import Track from '@/pages/Track';
import Pricing from '@/pages/Pricing';
import Services from '@/pages/Services';
import Contact from '@/pages/Contact';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import Account from '@/pages/Account';
import AuthCallback from '@/pages/AuthCallback';
import AboutUs from '@/pages/AboutUs';
import FAQ from '@/pages/FAQ';
import Support from '@/pages/Support';
import Reviews from '@/pages/Reviews';
import Gallery from '@/pages/Gallery';
import NotFound from '@/pages/NotFound';
import CollectionSchedule from '@/pages/CollectionSchedule';
import ShippingGuidelines from '@/pages/ShippingGuidelines';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import ShipmentDetails from '@/pages/ShipmentDetails';
import GalleryAdmin from '@/pages/GalleryAdmin';
import AddressBook from '@/pages/AddressBook';
import ConfirmBooking from '@/pages/ConfirmBooking';
import Receipt from '@/pages/Receipt';
import QuoteSubmitted from '@/pages/QuoteSubmitted';
import PaymentSuccess from '@/pages/PaymentSuccess';
import Notifications from '@/pages/Notifications';
import TaskManagement from '@/pages/TaskManagement';
import CustomQuoteRequest from '@/pages/CustomQuoteRequest';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <AuthProvider>
          <RoleProvider>
            <ThemeProvider>
              <ShippingProvider>
                <TooltipProvider>
                  <Router>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/track" element={<Track />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/about" element={<AboutUs />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/reviews" element={<Reviews />} />
                      <Route path="/gallery" element={<Gallery />} />
                      <Route path="/collection-schedule" element={<CollectionSchedule />} />
                      <Route path="/shipping-guidelines" element={<ShippingGuidelines />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                      <Route path="/quote-submitted" element={<QuoteSubmitted />} />
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route path="/custom-quote-request" element={<CustomQuoteRequest />} />
                      
                      {/* Protected routes */}
                      <Route path="/book-shipment" element={
                        <RouteGuard>
                          <BookShipment />
                        </RouteGuard>
                      } />
                      <Route path="/dashboard" element={
                        <RouteGuard>
                          <Dashboard />
                        </RouteGuard>
                      } />
                      <Route path="/admin" element={
                        <RouteGuard>
                          <AdminDashboard />
                        </RouteGuard>
                      } />
                      <Route path="/account" element={
                        <RouteGuard>
                          <Account />
                        </RouteGuard>
                      } />
                      <Route path="/shipment/:id" element={
                        <RouteGuard>
                          <ShipmentDetails />
                        </RouteGuard>
                      } />
                      <Route path="/admin/gallery" element={
                        <RouteGuard>
                          <GalleryAdmin />
                        </RouteGuard>
                      } />
                      <Route path="/address-book" element={
                        <RouteGuard>
                          <AddressBook />
                        </RouteGuard>
                      } />
                      <Route path="/confirm-booking" element={
                        <RouteGuard>
                          <ConfirmBooking />
                        </RouteGuard>
                      } />
                      <Route path="/receipt" element={
                        <RouteGuard>
                          <Receipt />
                        </RouteGuard>
                      } />
                      <Route path="/notifications" element={
                        <RouteGuard>
                          <Notifications />
                        </RouteGuard>
                      } />
                      <Route path="/tasks" element={
                        <RouteGuard>
                          <TaskManagement />
                        </RouteGuard>
                      } />
                      
                      {/* Catch all route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Router>
                </TooltipProvider>
              </ShippingProvider>
            </ThemeProvider>
          </RoleProvider>
        </AuthProvider>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
