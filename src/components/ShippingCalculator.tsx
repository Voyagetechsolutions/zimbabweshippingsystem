
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, Package, ArrowRight, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

const ShippingCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("drum");
  const [drumQuantity, setDrumQuantity] = useState<string>("1");
  const [weight, setWeight] = useState<string>("1");
  const [containerType, setContainerType] = useState<string>("20ft");

  const calculatePrice = () => {
    let basePrice = 0;
    
    // Calculate base price based on service type
    if (activeTab === 'drum') {
      const qty = parseInt(drumQuantity);
      if (qty >= 5) {
        basePrice = qty * 140;
      } else if (qty >= 2) {
        basePrice = qty * 145;
      } else {
        basePrice = 150;
      }
    } else if (activeTab === 'parcel') {
      const weightNum = parseFloat(weight) || 1;
      basePrice = weightNum * 50;
    } else if (activeTab === 'container') {
      if (containerType === '20ft') {
        basePrice = 3000;
      } else {
        basePrice = 5500;
      }
    }
    
    return {
      basePrice,
      totalPrice: basePrice
    };
  };

  const priceDetails = calculatePrice();

  return (
    <section className="py-16 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Calculate Shipping Cost</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get an instant estimate for your shipment from the UK to Zimbabwe.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-gray-200 overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-2xl">Shipping Calculator</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="drum" className="flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    Drum Shipping
                  </TabsTrigger>
                  <TabsTrigger value="container" className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Container
                  </TabsTrigger>
                  <TabsTrigger value="parcel" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Regular Parcel
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="drum" className="space-y-6">
                  <div>
                    <Label htmlFor="drumQuantity">Number of Drums</Label>
                    <Select value={drumQuantity} onValueChange={setDrumQuantity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quantity" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'Drum' : 'Drums'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-md text-sm">
                    <div className="font-medium mb-2">Pricing Tiers:</div>
                    <ul className="space-y-1 list-disc pl-5">
                      <li>1 Drum: £150 each</li>
                      <li>2-4 Drums: £145 each</li>
                      <li>5+ Drums: £140 each</li>
                    </ul>
                    <p className="mt-2 text-gray-500">Each drum has a capacity of 200L</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="container" className="space-y-6">
                  <div>
                    <Label htmlFor="containerType">Container Size</Label>
                    <Select value={containerType} onValueChange={setContainerType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select container size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20ft">20ft Container</SelectItem>
                        <SelectItem value="40ft">40ft Container</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-md text-sm">
                    <div className="font-medium mb-2">Container Pricing:</div>
                    <ul className="space-y-1 list-disc pl-5">
                      <li>20ft Container: £3,000</li>
                      <li>40ft Container: £5,500</li>
                    </ul>
                    <p className="mt-2 text-gray-500">
                      Ideal for businesses and large volume shipments
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="parcel" className="space-y-6">
                  <div>
                    <Label htmlFor="weight">Package Weight (kg)</Label>
                    <Input 
                      id="weight"
                      type="number" 
                      min="1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-md text-sm">
                    <div className="font-medium mb-2">Regular Parcel Pricing:</div>
                    <p>£50 per kg</p>
                    <p className="mt-2 text-gray-500">
                      Ideal for smaller packages and personal items
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center py-3 font-bold">
                  <span>Total Estimated Cost:</span>
                  <span className="text-2xl text-zim-green">£{priceDetails.totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <Link to="/book-shipment">
                  <Button className="bg-zim-green hover:bg-zim-green/90 text-lg px-8">
                    Book Now <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                <p className="mt-4 text-sm text-gray-500">
                  This is an estimate. Final pricing may vary based on specific shipping details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute left-0 top-0 w-64 h-64 bg-zim-green/5 rounded-full -translate-x-1/2 -translate-y-1/2 z-0"></div>
      <div className="absolute right-0 bottom-0 w-80 h-80 bg-zim-yellow/5 rounded-full translate-x-1/3 translate-y-1/3 z-0"></div>
    </section>
  );
};

export default ShippingCalculator;
