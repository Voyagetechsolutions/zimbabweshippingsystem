
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from '@/pages/Index';
import BookShipment from '@/pages/BookShipment';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import Auth from '@/pages/Auth';
import AddressBook from '@/pages/AddressBook';
import ShipmentDetails from '@/pages/ShipmentDetails';
import Contact from '@/pages/Contact';
import About from '@/pages/About';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import FAQ from '@/pages/FAQ';
import NotFound from '@/pages/NotFound';
import { AuthProvider } from '@/contexts/AuthContext';
import ReviewPage from '@/pages/ReviewPage';
import GalleryPage from '@/pages/GalleryPage';
import CollectionSchedulePage from '@/pages/CollectionSchedulePage';
import QuoteSubmitted from '@/pages/QuoteSubmitted';
import { Toaster } from '@/components/ui/toaster';
import { ToastProvider } from '@/hooks/use-toast';
import { ShippingProvider } from '@/contexts/ShippingContext';

function App() {
  return (
    // Ensure ToastProvider is the outer wrapper so it's available to AuthProvider
    <ToastProvider>
      <AuthProvider>
        <ShippingProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/book-shipment" element={<BookShipment />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/address-book" element={<AddressBook />} />
              <Route path="/shipment/:id" element={<ShipmentDetails />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/reviews" element={<ReviewPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/collection-schedule" element={<CollectionSchedulePage />} />
              <Route path="/quote-submitted" element={<QuoteSubmitted />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </ShippingProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
