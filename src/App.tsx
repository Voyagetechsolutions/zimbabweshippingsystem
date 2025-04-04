
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

// Pages
import Index from './pages/Index';
import Auth from './pages/Auth';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import Track from './pages/Track';
import BookShipment from './pages/BookShipment';
import PaymentSuccess from './pages/PaymentSuccess';
import Dashboard from './pages/Dashboard';
import ShipmentDetails from './pages/ShipmentDetails';
import NotFound from './pages/NotFound';
import Account from './pages/Account';
import AddressBook from './pages/AddressBook';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';
import GalleryAdmin from './pages/GalleryAdmin';
import Reviews from './pages/Reviews';
import CreateShipment from './pages/CreateShipment';
import TaskManagement from './pages/TaskManagement';

// Components
import RouteGuard from './components/RouteGuard';
import { Toaster } from './components/ui/toaster';
import WhatsAppButton from './components/WhatsAppButton';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ShippingProvider } from './contexts/ShippingContext';

// Initialize React Query client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ShippingProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/services" element={<Services />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/track" element={<Track />} />
                <Route path="/book-shipment" element={<BookShipment />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/reviews" element={<Reviews />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <RouteGuard>
                      <Dashboard />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/shipment/:id"
                  element={
                    <RouteGuard>
                      <ShipmentDetails />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <RouteGuard>
                      <Account />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/address-book"
                  element={
                    <RouteGuard>
                      <AddressBook />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <RouteGuard>
                      <Notifications />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/create-shipment"
                  element={
                    <RouteGuard>
                      <CreateShipment />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/task-management"
                  element={
                    <RouteGuard>
                      <TaskManagement />
                    </RouteGuard>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <RouteGuard requireAdmin>
                      <AdminDashboard />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/admin/gallery"
                  element={
                    <RouteGuard requireAdmin>
                      <GalleryAdmin />
                    </RouteGuard>
                  }
                />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              <WhatsAppButton />
              <Toaster />
            </Router>
          </ShippingProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
