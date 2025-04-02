
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { RequireAuth, RedirectIfAuthenticated } from "./components/RouteGuard";
import CreateShipment from "./pages/CreateShipment";
import BookShipment from "./pages/BookShipment";
import Track from "./pages/Track";
import Account from "./pages/Account";
import AdminDashboard from "./pages/AdminDashboard";
import ShipmentDetails from "./pages/ShipmentDetails";
import Services from "./pages/Services";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
