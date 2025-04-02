
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TrackingSection = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingNumber.trim()) {
      toast({
        title: "Tracking number required",
        description: "Please enter a valid tracking number.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Query the shipments table to find the shipment by tracking number
      const { data, error } = await supabase
        .from('shipments')
        .select('id')
        .eq('tracking_number', trackingNumber.trim())
        .single();
      
      if (error || !data) {
        toast({
          title: "Shipment not found",
          description: "We couldn't find a shipment with that tracking number. Please check and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Redirect to the shipment details page
      navigate(`/shipment/${data.id}`);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while tracking your shipment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center justify-center bg-zim-green/10 p-3 rounded-full mb-4">
            <Package className="h-6 w-6 text-zim-green" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Track Your Shipment</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Enter your tracking number to get real-time updates on your shipment's status and location.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleTracking} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Enter your tracking number (e.g. ABCD1234)"
                className="pl-11 h-12"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              type="submit" 
              className="bg-zim-green hover:bg-zim-green/90 h-12 px-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Tracking...
                </span>
              ) : (
                "Track Shipment"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-gray-500 text-sm">
            <p>Need to ship something? <a href="/auth" className="text-zim-green hover:underline">Sign in</a> or <a href="/auth" className="text-zim-green hover:underline">create an account</a> to get started.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackingSection;
