import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ShippingProvider } from './contexts/ShippingContext';
import { Toaster } from '@/components/ui/toaster';

// Page imports
import Index from './pages/Index';
import AboutUs from './pages/AboutUs';
import BookShipment from './pages/BookShipment';
import CollectionSchedule from './pages/CollectionSchedule';
import Dashboard from './pages/Dashboard';
import FAQ from './pages/FAQ';
import Gallery from './pages/Gallery';
import NotFound from './pages/NotFound';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Services from './pages/Services';
import Support from './pages/Support';
import TermsAndConditions from './pages/TermsAndConditions';
import Track from './pages/Track';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Account from './pages/Account';
import AddressBook from './pages/AddressBook';
import AdminDashboard from './pages/AdminDashboard';
import GalleryAdmin from './pages/GalleryAdmin';
import ShipmentDetails from './pages/ShipmentDetails';
import Reviews from './pages/Reviews';
import Notifications from './pages/Notifications';
import QuoteSubmitted from './pages/QuoteSubmitted';
import TaskManagement from './pages/TaskManagement';
import Contact from './pages/Contact';
import Receipt from './pages/Receipt';
import PaymentSuccess from './pages/PaymentSuccess';
import ConfirmBooking from './pages/ConfirmBooking';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <ShippingProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <Router>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/collection-schedule" element={<CollectionSchedule />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/services" element={<Services />} />
                <Route path="/support" element={<Support />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/track" element={<Track />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/account" element={<Account />} />
                <Route path="/address-book" element={<AddressBook />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/gallery" element={<GalleryAdmin />} />
                <Route path="/shipments/:id" element={<ShipmentDetails />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/quote-submitted" element={<QuoteSubmitted />} />
                <Route path="/task-management" element={<TaskManagement />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/book-shipment" element={<BookShipment />} />
                <Route path="/receipt/:id" element={<Receipt />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/confirm-booking" element={<ConfirmBooking />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </Router>
          </QueryClientProvider>
        </AuthProvider>
      </ShippingProvider>
    </ThemeProvider>
  );
}

export default App;
