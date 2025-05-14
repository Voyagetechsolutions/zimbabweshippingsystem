
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useShipping } from '@/contexts/ShippingContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronRight, Package, Quote, X } from 'lucide-react';

type QuoteDetails = {
  id: string;
  description: string;
  category: string;
  specificItem: string;
  amount: number;
  adminNotes?: string;
};

const ConfirmBooking: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setShipmentDetails } = useShipping();
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set document title
    document.title = 'Confirm Booking | UK to Zimbabwe Shipping';
    
    // Get quote details from localStorage
    const storedQuote = localStorage.getItem('selectedQuote');
    if (storedQuote) {
      try {
        const parsedQuote = JSON.parse(storedQuote);
        setQuoteDetails(parsedQuote);
      } catch (error) {
        console.error('Error parsing stored quote:', error);
        toast({
          title: 'Error',
          description: 'Could not load quote details. Please try again.',
          variant: 'destructive',
        });
        navigate('/dashboard');
      }
    } else {
      // No quote found, redirect to dashboard
      toast({
        title: 'No Quote Selected',
        description: 'No quote was selected for booking.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [navigate, toast]);

  const handleProceedToPayment = async () => {
    if (!quoteDetails || !user) {
      toast({
        title: 'Error',
        description: 'Missing quote details or user information.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update the custom quote status to 'accepted'
      await supabase
        .from('custom_quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteDetails.id);

      // Store shipment details in the shipping context
      setShipmentDetails({
        originCountry: 'UK',
        destinationCountry: 'Zimbabwe',
        includeDrums: false,
        quantity: 0,
        includeOtherItems: true,
        category: quoteDetails.category,
        description: quoteDetails.description,
        specificItem: quoteDetails.specificItem,
        totalAmount: quoteDetails.amount,
        customQuoteId: quoteDetails.id,
        isCustomQuote: true
      });

      // Clean up localStorage
      localStorage.removeItem('selectedQuote');
      
      // Navigate to payment page
      navigate('/payment-method');
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('selectedQuote');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Confirm Your Booking</h1>
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Dashboard</span>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span>My Quotes</span>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground">Confirm Booking</span>
              </div>
            </div>

            {quoteDetails ? (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center mb-2">
                    <Quote className="h-5 w-5 mr-2 text-zim-green" />
                    <CardTitle>Custom Quote Booking</CardTitle>
                  </div>
                  <CardDescription>
                    Please review and confirm your custom quote booking details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div>
                      <h3 className="font-medium">Item Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Category</p>
                          <p>{quoteDetails.category}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Item</p>
                          <p>{quoteDetails.specificItem}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-muted-foreground">Description</p>
                        <p className="text-sm">{quoteDetails.description}</p>
                      </div>
                    </div>

                    {quoteDetails.adminNotes && (
                      <div className="border-t pt-3">
                        <h3 className="font-medium">Additional Information</h3>
                        <p className="text-sm mt-1">{quoteDetails.adminNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount:</span>
                      <span className="text-2xl font-bold text-zim-green">
                        {formatCurrency(quoteDetails.amount, 'GBP')}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <Button variant="outline" onClick={handleCancel} disabled={loading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleProceedToPayment} disabled={loading}>
                    <Check className="h-4 w-4 mr-2" />
                    Proceed to Payment
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConfirmBooking;
