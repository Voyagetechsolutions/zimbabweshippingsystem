
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CustomQuoteForm from '@/components/CustomQuoteForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomQuoteRequest = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<any>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);

  useEffect(() => {
    // Get shipment ID and any data from location state
    if (location.state?.shipmentId) {
      setShipmentId(location.state.shipmentId);
      
      if (location.state.initialData) {
        setInitialData(location.state.initialData);
      } else {
        // If we have shipmentId but no initialData, fetch the shipment details
        fetchShipmentDetails(location.state.shipmentId);
      }
    }
    
    document.title = 'Request Custom Quote | UK to Zimbabwe Shipping';
  }, [location]);

  const fetchShipmentDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setInitialData({
          shipmentDetails: data.metadata || {},
          senderDetails: data.metadata?.sender_details || {},
          recipientDetails: data.metadata?.recipient_details || {}
        });
      }
    } catch (error) {
      console.error('Error fetching shipment details:', error);
    }
  };

  const handleSubmitSuccess = (quoteId: string) => {
    toast({
      title: 'Quote Requested',
      description: 'Your custom quote request has been submitted successfully.',
    });
    navigate('/dashboard', { 
      state: { 
        activeTab: 'quotes',
        quoteSubmitted: true 
      } 
    });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
        <Footer />
      </>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    useEffect(() => {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to submit a custom quote request',
        variant: 'destructive',
      });
      
      // Save the current location to redirect back after auth
      localStorage.setItem('authRedirectPath', '/custom-quote-request');
      if (shipmentId) {
        localStorage.setItem('pendingShipmentId', shipmentId);
      }
      
      navigate('/auth');
    }, []);
    
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="bg-gray-50 py-12 px-4 min-h-screen">
        <div className="container mx-auto max-w-4xl">
          <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold mb-2">Request Custom Quote</h1>
          <p className="text-gray-600 mb-8">
            Tell us about your item, and we'll provide you with a custom shipping quote.
          </p>
          
          <CustomQuoteForm 
            bookingData={initialData}
            onSubmit={(data) => {
              // The form component handles the submission to Supabase
              handleSubmitSuccess(data.id);
            }}
            onCancel={handleCancel}
          />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CustomQuoteRequest;
