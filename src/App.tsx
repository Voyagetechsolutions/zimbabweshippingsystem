
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { RequireAuth, RedirectIfAuthenticated, RequireAdmin } from "./components/RouteGuard";
import CreateShipment from "./pages/CreateShipment";
import BookShipment from "./pages/BookShipment";
import Track from "./pages/Track";
import Account from "./pages/Account";
import AdminDashboard from "./pages/AdminDashboard";
import ShipmentDetails from "./pages/ShipmentDetails";
import Services from "./pages/Services";
import Contact from "./pages/Contact";

// Configure the QueryClient with retry options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Retry failed queries only once
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 5 * 60 * 1000, // Cache for 5 minutes (formerly cacheTime)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={
              <RedirectIfAuthenticated>
                <Auth />
              </RedirectIfAuthenticated>
            } />
            <Route path="/dashboard" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />
            <Route path="/create-shipment" element={
              <RequireAuth>
                <CreateShipment />
              </RequireAuth>
            } />
            <Route path="/book-shipment" element={<BookShipment />} />
            <Route path="/shipment/:id" element={<ShipmentDetails />} />
            <Route path="/track" element={<Track />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/account" element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            } />
            <Route path="/admin" element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            } />
            {/* Redirect old URLs or potential misspellings to proper routes */}
            <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/dashboard-admin" element={<Navigate to="/admin" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
