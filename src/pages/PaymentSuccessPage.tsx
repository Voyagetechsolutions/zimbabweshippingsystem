
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Receipt from '@/components/Receipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Home, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Set page title
    document.title = 'Payment Successful | UK to Zimbabwe Shipping';
    
    const fetchShipmentData = async () => {
      try {
        // Extract shipment ID from URL parameters
        const params = new URLSearchParams(location.search);
        const shipmentId = params.get('shipment_id');
        
        if (!shipmentId) {
          console.error('No shipment ID provided');
          setLoading(false);
          return;
        }
        
        // Fetch shipment data from Supabase
        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', shipmentId)
          .single();
        
        if (error) throw error;
        
        setShipmentData(data);
      } catch (error) {
        console.error('Error fetching shipment data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchShipmentData();
  }, [location]);
  
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-green-200 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Successful!</h1>
                <p className="mt-2 text-gray-600">
                  Thank you for your payment. Your shipment has been confirmed.
                </p>
              </div>
              
              {shipmentData ? (
                <div className="border-t border-gray-200 pt-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">Shipment Details</h2>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Tracking Number:</span>{' '}
                        {shipmentData.tracking_number}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">Status:</span>{' '}
                        Payment Completed
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">Estimated Delivery:</span>{' '}
                        {shipmentData.estimated_delivery ? 
                          new Date(shipmentData.estimated_delivery).toLocaleDateString() : 
                          'To be determined'}
                      </p>
                    </div>
                  </div>
                  
                  <Receipt shipmentData={shipmentData} />
                </div>
              ) : loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 border border-yellow-200 rounded-md bg-yellow-50">
                  <p className="text-yellow-800">
                    Shipment details could not be loaded. Please check your dashboard for shipment information.
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-wrap gap-4 justify-center">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => navigate('/')}
              >
                <Home className="h-4 w-4" />
                Return to Home
              </Button>
              
              <Button 
                className="flex items-center gap-2 bg-zim-green hover:bg-zim-green/90"
                onClick={() => navigate('/tracking')}
              >
                Track Shipment
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // Functionality to download receipt would go here
                  console.log('Download receipt');
                }}
              >
                <FileText className="h-4 w-4" />
                Download Receipt
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PaymentSuccessPage;
