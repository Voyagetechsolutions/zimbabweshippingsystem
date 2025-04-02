
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Truck, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

const CreateShipment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    weight: '',
    dimensions: '',
    carrier: 'ZimExpress',
    estimatedDelivery: null as Date | null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData({
      ...formData,
      estimatedDelivery: date || null,
    });
  };

  const generateTrackingNumber = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let tracking = '';
    
    // Generate 4 random letters
    for (let i = 0; i < 4; i++) {
      tracking += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Generate 4 random numbers
    for (let i = 0; i < 4; i++) {
      tracking += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return tracking;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.origin || !formData.destination) {
      toast({
        title: "Missing information",
        description: "Please fill in both origin and destination fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Generate a unique tracking number
      const trackingNumber = generateTrackingNumber();
      
      // Convert Date object to ISO string for database storage
      const estimatedDeliveryString = formData.estimatedDelivery 
        ? formData.estimatedDelivery.toISOString() 
        : null;
      
      // Insert the shipment into the database
      const { error } = await supabase
        .from('shipments')
        .insert({
          user_id: user?.id,
          tracking_number: trackingNumber,
          origin: formData.origin,
          destination: formData.destination,
          status: 'Processing',
          weight: formData.weight ? parseFloat(formData.weight) : null,
          dimensions: formData.dimensions || null,
          carrier: formData.carrier,
          estimated_delivery: estimatedDeliveryString,
        });

      if (error) throw error;
      
      toast({
        title: "Shipment Created",
        description: `Your shipment has been created with tracking number: ${trackingNumber}`,
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error creating shipment",
        description: error.message || "An error occurred while creating your shipment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-zim-green/10 p-3 rounded-full">
              <Truck className="h-6 w-6 text-zim-green" />
            </div>
            <h1 className="text-2xl font-bold">Create New Shipment</h1>
          </div>
          <p className="text-gray-500">Fill in the details to create a new shipment</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    id="origin"
                    name="origin"
                    placeholder="e.g. London, UK"
                    value={formData.origin}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    id="destination"
                    name="destination"
                    placeholder="e.g. Harare, Zimbabwe"
                    value={formData.destination}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5.5"
                  value={formData.weight}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions (L x W x H cm)</Label>
                <Input
                  id="dimensions"
                  name="dimensions"
                  placeholder="e.g. 30x20x15"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Select 
                  value={formData.carrier} 
                  onValueChange={(value) => handleSelectChange('carrier', value)}
                >
                  <SelectTrigger id="carrier">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZimExpress">ZimExpress</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimated-delivery">Estimated Delivery</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="estimated-delivery"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.estimatedDelivery ? (
                        format(formData.estimatedDelivery, "PPP")
                      ) : (
                        <span>Select a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.estimatedDelivery || undefined}
                      onSelect={handleDateChange}
                      initialFocus
                      fromDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-zim-green hover:bg-zim-green/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              "Create Shipment"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateShipment;
