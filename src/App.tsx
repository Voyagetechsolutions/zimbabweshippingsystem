
import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import AboutPage from '@/pages/About';
import ServicesPage from '@/pages/Services';
import PricingPage from '@/pages/Pricing';
import ContactPage from '@/pages/Contact';
import WhatsAppButton from '@/components/WhatsAppButton';
import BookShipment from '@/pages/BookShipment';
import TrackingPage from '@/pages/Tracking';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleProvider } from '@/contexts/RoleContext';
import { ThemeProvider } from '@/components/theme-provider';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import QuoteSubmittedPage from '@/pages/QuoteSubmittedPage';
import ProfilePage from '@/pages/ProfilePage';
import CustomQuotePayment from '@/pages/CustomQuotePayment';
import './globals.css';

function App() {
  useEffect(() => {
    // Set default title
    document.title = 'UK to Zimbabwe Shipping Service';
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/book-shipment" element={<BookShipment />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/quote-submitted" element={<QuoteSubmittedPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/payment/custom-quote" element={<CustomQuotePayment />} />
            </Routes>
            <WhatsAppButton />
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
