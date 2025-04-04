
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
import { RequireAuth, RequireAdmin, RedirectIfAuthenticated, RequireRole } from './components/RouteGuard';
import { Toaster } from './components/ui/toaster';
import WhatsAppButton from './components/WhatsAppButton';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ShippingProvider } from './contexts/ShippingContext';
import { RoleProvider } from './contexts/RoleContext';

// Initialize React Query client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <ThemeProvider>
            <ShippingProvider>
              <Router>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<RedirectIfAuthenticated><Auth /></RedirectIfAuthenticated>} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/track" element={<Track />} />
                  <Route path="/book-shipment" element={<BookShipment />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/reviews" element={<Reviews />} />

                  {/* Protected routes - any authenticated user */}
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/shipment/:id"
                    element={
                      <RequireAuth>
                        <ShipmentDetails />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <RequireAuth>
                        <Account />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/address-book"
                    element={
                      <RequireAuth>
                        <AddressBook />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <RequireAuth>
                        <Notifications />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/create-shipment"
                    element={
                      <RequireAuth>
                        <CreateShipment />
                      </RequireAuth>
                    }
                  />
                  
                  {/* Role-specific routes */}
                  <Route
                    path="/admin/logistics"
                    element={
                      <RequireRole requiredRole="logistics">
                        <TaskManagement />
                      </RequireRole>
                    }
                  />

                  <Route
                    path="/driver"
                    element={
                      <RequireRole requiredRole="driver">
                        <TaskManagement />
                      </RequireRole>
                    }
                  />

                  <Route
                    path="/support"
                    element={
                      <RequireRole requiredRole="support">
                        <TaskManagement />
                      </RequireRole>
                    }
                  />

                  <Route
                    path="/task-management"
                    element={
                      <RequireAuth>
                        <TaskManagement />
                      </RequireAuth>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin"
                    element={
                      <RequireAdmin>
                        <AdminDashboard />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/gallery"
                    element={
                      <RequireAdmin>
                        <GalleryAdmin />
                      </RequireAdmin>
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
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
