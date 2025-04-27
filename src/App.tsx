
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import { ShippingProvider } from './contexts/ShippingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import Gallery from './pages/Gallery';
import Track from './pages/Track';
import Contact from './pages/Contact';
import BookShipment from './pages/BookShipment';
import QuoteSubmitted from './pages/QuoteSubmitted';
import FAQ from './pages/FAQ';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Reviews from './pages/Reviews';
import CollectionSchedule from './pages/CollectionSchedule';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import Account from './pages/Account';
import ShipmentDetails from './pages/ShipmentDetails';
import AddressBook from './pages/AddressBook';
import PaymentSuccess from './pages/PaymentSuccess';
import AdminDashboard from './pages/AdminDashboard';
import GalleryAdmin from './pages/GalleryAdmin';
import TaskManagement from './pages/TaskManagement';
import NotFound from './pages/NotFound';
import { RouteGuard } from './components/RouteGuard';
import { Toaster } from '@/components/ui/toaster';
import WhatsAppButton from './components/WhatsAppButton';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <RoleProvider>
          <ShippingProvider>
            <ThemeProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/track" element={<Track />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/book-shipment" element={<BookShipment />} />
                  <Route path="/quote-submitted" element={<QuoteSubmitted />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/collection-schedule" element={<CollectionSchedule />} />
                  
                  {/* Protected Routes */}
                  <Route element={<RouteGuard allowedRoles={['customer', 'admin', 'driver', 'support']} />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/shipment/:id" element={<ShipmentDetails />} />
                    <Route path="/address-book" element={<AddressBook />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                  </Route>
                  
                  {/* Admin Routes */}
                  <Route element={<RouteGuard allowedRoles={['admin']} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/gallery-admin" element={<GalleryAdmin />} />
                    <Route path="/tasks" element={<TaskManagement />} />
                  </Route>
                  
                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
                <WhatsAppButton />
              </Router>
            </ThemeProvider>
          </ShippingProvider>
        </RoleProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
