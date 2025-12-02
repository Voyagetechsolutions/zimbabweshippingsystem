import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SimpleBookingForm, { BookingData } from '@/components/booking/SimpleBookingForm';
import { Button } from '@/components/ui/button';
import { Check, Copy, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SimpleBooking: React.FC = () => {
  const [completed, setCompleted] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleComplete = (data: BookingData, tracking: string) => {
    setBookingData(data);
    setTrackingNumber(tracking);
    setCompleted(true);
  };

  const copyTrackingNumber = () => {
    navigator.clipboard.writeText(trackingNumber);
    toast({
      title: "Copied!",
      description: "Tracking number copied to clipboard",
    });
  };

  if (completed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Booking Submitted!
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you, {bookingData?.sender.firstName}! We've received your booking and will be in touch soon to arrange collection.
            </p>
            
            <div className="bg-card border rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Your Tracking Number</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-mono font-bold text-primary">
                  {trackingNumber}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyTrackingNumber}
                  className="h-8 w-8"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Save this number to track your shipment
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/track')}
                className="w-full"
              >
                <Package className="w-4 h-4 mr-2" />
                Track Your Shipment
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCompleted(false);
                  setTrackingNumber('');
                  setBookingData(null);
                }}
                className="w-full"
              >
                Book Another Shipment
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Book Your Shipment
          </h1>
          <p className="text-muted-foreground">
            Ship from UK to Zimbabwe in just a few simple steps
          </p>
        </div>
        <SimpleBookingForm onComplete={handleComplete} />
      </main>
      <Footer />
    </div>
  );
};

export default SimpleBooking;
