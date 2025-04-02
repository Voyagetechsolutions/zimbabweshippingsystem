
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Package, Truck, Map, Info } from 'lucide-react';

const BookShipment: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    senderName: user?.user_metadata?.full_name || '',
    senderEmail: user?.email || '',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    deliveryAddress: '',
    packageType: 'parcel',
    packageWeight: '',
    packageDimensions: '',
    packageDescription: '',
    specialInstructions: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real application, this would send data to your backend
    console.log('Form submitted:', formData);
    
    toast({
      title: "Booking Request Submitted",
      description: "We'll contact you shortly to confirm your shipment details.",
    });
    
    // Redirect to create shipment page if user is logged in
    if (user) {
      navigate('/create-shipment');
    } else {
      // If not logged in, prompt to sign up/login
      navigate('/auth', { 
        state: { 
          message: "Create an account to complete your shipment booking" 
        } 
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center">
                <BookOpen className="mr-3 h-8 w-8 text-zim-green" />
                Book Your Shipment
              </h1>
              <p className="text-gray-600">
                Fill out the form below to request a shipping quote. Our team will contact you 
                to confirm the details and finalize your booking.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
                <CardDescription>
                  Please provide accurate information to ensure timely delivery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sender Information */}
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h2 className="font-semibold flex items-center">
                          <Info className="mr-2 h-4 w-4 text-zim-green" /> 
                          Sender Information
                        </h2>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="senderName">Full Name</Label>
                          <Input 
                            id="senderName" 
                            name="senderName" 
                            value={formData.senderName} 
                            onChange={handleChange} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="senderEmail">Email</Label>
                          <Input 
                            id="senderEmail" 
                            name="senderEmail" 
                            type="email"
                            value={formData.senderEmail} 
                            onChange={handleChange} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="senderPhone">Phone Number</Label>
                          <Input 
                            id="senderPhone" 
                            name="senderPhone" 
                            value={formData.senderPhone} 
                            onChange={handleChange} 
                            required 
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Recipient Information */}
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h2 className="font-semibold flex items-center">
                          <Map className="mr-2 h-4 w-4 text-zim-green" />
                          Recipient Information
                        </h2>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="recipientName">Recipient Name</Label>
                          <Input 
                            id="recipientName" 
                            name="recipientName" 
                            value={formData.recipientName} 
                            onChange={handleChange} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="recipientPhone">Recipient Phone</Label>
                          <Input 
                            id="recipientPhone" 
                            name="recipientPhone" 
                            value={formData.recipientPhone} 
                            onChange={handleChange} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="deliveryAddress">Delivery Address in Zimbabwe</Label>
                          <Textarea 
                            id="deliveryAddress" 
                            name="deliveryAddress" 
                            value={formData.deliveryAddress} 
                            onChange={handleChange} 
                            required 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Package Details */}
                  <div className="pt-4 border-t space-y-4">
                    <div className="pb-2">
                      <h2 className="font-semibold flex items-center">
                        <Package className="mr-2 h-4 w-4 text-zim-green" />
                        Package Details
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="packageType">Package Type</Label>
                        <Select
                          value={formData.packageType}
                          onValueChange={(value) => handleSelectChange('packageType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select package type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="parcel">Parcel</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="drum">Drum (200L)</SelectItem>
                            <SelectItem value="furniture">Furniture</SelectItem>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="packageWeight">Estimated Weight (kg)</Label>
                        <Input 
                          id="packageWeight" 
                          name="packageWeight" 
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={formData.packageWeight} 
                          onChange={handleChange} 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="packageDimensions">Dimensions (LxWxH in cm, optional)</Label>
                      <Input 
                        id="packageDimensions" 
                        name="packageDimensions"
                        placeholder="e.g., 30x20x15" 
                        value={formData.packageDimensions} 
                        onChange={handleChange} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="packageDescription">Package Description</Label>
                      <Textarea 
                        id="packageDescription" 
                        name="packageDescription"
                        placeholder="Please describe the contents of your package" 
                        value={formData.packageDescription} 
                        onChange={handleChange} 
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="specialInstructions">Special Instructions (optional)</Label>
                      <Textarea 
                        id="specialInstructions" 
                        name="specialInstructions"
                        placeholder="Any special handling instructions or notes" 
                        value={formData.specialInstructions} 
                        onChange={handleChange} 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="submit"
                      className="w-full md:w-auto bg-zim-green hover:bg-zim-green/90"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      Submit Booking Request
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookShipment;
