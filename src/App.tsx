
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleProvider } from '@/contexts/RoleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ShippingProvider } from '@/contexts/ShippingContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RequireAuth, RequireAdmin, RedirectIfAuthenticated } from '@/components/RouteGuard';
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy load pages for code splitting and better performance
const Index = lazy(() => import('@/pages/Index'));
const BookShipment = lazy(() => import('@/pages/BookShipment'));
const SimpleBooking = lazy(() => import('@/pages/SimpleBooking'));
const Track = lazy(() => import('@/pages/Track'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Services = lazy(() => import('@/pages/Services'));
const Contact = lazy(() => import('@/pages/Contact'));
const Auth = lazy(() => import('@/pages/Auth'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Account = lazy(() => import('@/pages/Account'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const AboutUs = lazy(() => import('@/pages/AboutUs'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Support = lazy(() => import('@/pages/Support'));
const Reviews = lazy(() => import('@/pages/Reviews'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const CollectionSchedule = lazy(() => import('@/pages/CollectionSchedule'));
const ShippingGuidelines = lazy(() => import('@/pages/ShippingGuidelines'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
const ShipmentDetails = lazy(() => import('@/pages/ShipmentDetails'));
const GalleryAdmin = lazy(() => import('@/pages/GalleryAdmin'));
const AddressBook = lazy(() => import('@/pages/AddressBook'));
const ConfirmBooking = lazy(() => import('@/pages/ConfirmBooking'));
const Receipt = lazy(() => import('@/pages/Receipt'));
const QuoteSubmitted = lazy(() => import('@/pages/QuoteSubmitted'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const TaskManagement = lazy(() => import('@/pages/TaskManagement'));
const CustomQuoteRequest = lazy(() => import('@/pages/CustomQuoteRequest'));

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background">
          <AuthProvider>
            <RoleProvider>
              <ThemeProvider>
                <ShippingProvider>
                  <TooltipProvider>
                    <Router>
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                      }>
                        <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={
                        <RedirectIfAuthenticated>
                          <Auth />
                        </RedirectIfAuthenticated>
                      } />
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
                      <Route path="/book" element={<SimpleBooking />} />
                      
                      {/* Protected routes */}
                      <Route path="/book-shipment" element={
                        <RequireAuth>
                          <BookShipment />
                        </RequireAuth>
                      } />
                      <Route path="/dashboard" element={
                        <RequireAuth>
                          <Dashboard />
                        </RequireAuth>
                      } />
                      <Route path="/admin" element={
                        <RequireAdmin>
                          <AdminDashboard />
                        </RequireAdmin>
                      } />
                      <Route path="/account" element={
                        <RequireAuth>
                          <Account />
                        </RequireAuth>
                      } />
                      <Route path="/shipment/:id" element={
                        <RequireAuth>
                          <ShipmentDetails />
                        </RequireAuth>
                      } />
                      <Route path="/admin/gallery" element={
                        <RequireAdmin>
                          <GalleryAdmin />
                        </RequireAdmin>
                      } />
                      <Route path="/address-book" element={
                        <RequireAuth>
                          <AddressBook />
                        </RequireAuth>
                      } />
                      <Route path="/confirm-booking" element={
                        <RequireAuth>
                          <ConfirmBooking />
                        </RequireAuth>
                      } />
                      <Route path="/receipt" element={
                        <RequireAuth>
                          <Receipt />
                        </RequireAuth>
                      } />
                      <Route path="/notifications" element={
                        <RequireAuth>
                          <Notifications />
                        </RequireAuth>
                      } />
                      <Route path="/tasks" element={
                        <RequireAuth>
                          <TaskManagement />
                        </RequireAuth>
                      } />
                      
                        {/* Catch all route */}
                        <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </Router>
                  </TooltipProvider>
                </ShippingProvider>
              </ThemeProvider>
            </RoleProvider>
          </AuthProvider>
          <Toaster />
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
