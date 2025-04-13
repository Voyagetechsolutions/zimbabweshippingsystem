
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, Package, ArrowRight, MessageSquare, FileText, Sofa, Tv, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShipping } from '@/contexts/ShippingContext';

const ShippingCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("drum");
  const [drumQuantity, setDrumQuantity] = useState<string>("1");
  const [paymentType, setPaymentType] = useState<string>("standard");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [itemCategory, setItemCategory] = useState<string>("furniture");
  const [additionalServices, setAdditionalServices] = useState({
    doorToDoor: false
  });
  const { formatPrice } = useShipping();

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setAdditionalServices(prev => ({ ...prev, [name]: checked }));
  };

  const calculatePrice = () => {
    let basePrice = 0;
    
    // Calculate base price based on service type
    if (activeTab === 'drum') {
      const qty = parseInt(drumQuantity);
      
      if (paymentType === "standard") {
        // Standard payment prices
        if (qty >= 5) {
          basePrice = qty * 220;
        } else if (qty >= 2) {
          basePrice = qty * 240;
        } else {
          basePrice = 260;
        }
      } else {
        // Pay later prices (30-day terms)
        if (qty >= 5) {
          basePrice = qty * 240;
        } else if (qty >= 2) {
          basePrice = qty * 260;
        } else {
          basePrice = 280;
        }
      }
    } else {
      // For other items, we'll use a fixed price based on category instead of volume
      switch(itemCategory) {
        case "furniture":
          basePrice = 150;
          break;
        case "appliances":
          basePrice = 180;
          break;
        case "electronics":
          basePrice = 120;
          break;
        case "building":
          basePrice = 200;
          break;
        default:
          basePrice = 150;
      }
    }
    
    // Add price for additional services
    let additionalCost = 0;
    if (additionalServices.doorToDoor) {
      additionalCost += 25;
    }
    
    return {
      basePrice,
      additionalCost,
      totalPrice: basePrice + additionalCost
    };
  };

  const priceDetails = calculatePrice();

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Calculate Shipping Cost</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get an instant estimate for your shipment from the UK.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-gray-200 dark:border-gray-700 overflow-hidden dark:bg-gray-800 shadow-lg">
            <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <CardTitle className="text-2xl dark:text-white">Shipping Calculator</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <Label htmlFor="paymentType" className="text-base font-medium block mb-2 dark:text-white">Payment Option</Label>
                <RadioGroup 
                  value={paymentType} 
                  onValueChange={setPaymentType} 
                  className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="font-medium dark:text-white">Standard Payment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="payLater" id="payLater" />
                    <Label htmlFor="payLater" className="font-medium dark:text-white">Pay Later (30 Days)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="drum" className="flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    Drum Shipping
                  </TabsTrigger>
                  <TabsTrigger value="other" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Other Items
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
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 75, 100].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md text-sm">
                    <div className="font-medium mb-2 dark:text-white">Pricing Tiers:</div>
                    {paymentType === "standard" ? (
                      <ul className="space-y-1 list-disc pl-5 dark:text-gray-200">
                        <li>1 Drum: {formatPrice(260)} each</li>
                        <li>2-4 Drums: {formatPrice(240)} each</li>
                        <li>5+ Drums: {formatPrice(220)} each</li>
                      </ul>
                    ) : (
                      <ul className="space-y-1 list-disc pl-5 dark:text-gray-200">
                        <li>1 Drum: {formatPrice(280)} each</li>
                        <li>2-4 Drums: {formatPrice(260)} each</li>
                        <li>5+ Drums: {formatPrice(240)} each</li>
                      </ul>
                    )}
                    <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-300">Each drum has a capacity of 200L-220L</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="other" className="space-y-6">
                  <div>
                    <Label htmlFor="itemCategory">Item Category</Label>
                    <Select value={itemCategory} onValueChange={setItemCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="appliances">Appliances</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="building">Building Materials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="font-medium mb-2 dark:text-white">Items We Ship:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                        <Sofa className="h-5 w-5 text-zim-green mt-1" />
                        <div>
                          <h4 className="font-medium text-sm mb-1 dark:text-white">Furniture:</h4>
                          <ul className="text-xs list-disc pl-5 dark:text-gray-200">
                            <li>Sofas & Chairs</li>
                            <li>Tables & Cabinets</li>
                            <li>Beds & Mattresses</li>
                            <li>Wardrobes & Dressers</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                        <Tv className="h-5 w-5 text-zim-green mt-1" />
                        <div>
                          <h4 className="font-medium text-sm mb-1 dark:text-white">Appliances & Electronics:</h4>
                          <ul className="text-xs list-disc pl-5 dark:text-gray-200">
                            <li>Refrigerators & Freezers</li>
                            <li>Washing Machines</li>
                            <li>Televisions & Computers</li>
                            <li>Kitchen Appliances</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                        <FileText className="h-5 w-5 text-zim-green mt-1" />
                        <div>
                          <h4 className="font-medium text-sm mb-1 dark:text-white">Building Materials:</h4>
                          <ul className="text-xs list-disc pl-5 dark:text-gray-200">
                            <li>Door Frames & Windows</li>
                            <li>Plumbing & Electrical</li>
                            <li>Tools & Hardware</li>
                            <li>Construction Equipment</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                        <Truck className="h-5 w-5 text-zim-green mt-1" />
                        <div>
                          <h4 className="font-medium text-sm mb-1 dark:text-white">Special Items:</h4>
                          <ul className="text-xs list-disc pl-5 dark:text-gray-200">
                            <li>Vehicles & Parts</li>
                            <li>Musical Instruments</li>
                            <li>Artwork & Antiques</li>
                            <li>Special Equipment</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-center text-sm mb-3 dark:text-white">
                        Need a precise quote for your specific items?
                      </p>
                      <Link to="/custom-quote">
                        <Button variant="outline" size="sm" className="flex items-center">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Request Custom Quote
                        </Button>
                      </Link>
                    </div>
                  </div>
                </TabsContent>
                
                <div className="mt-8">
                  <p className="font-medium text-lg mb-3 dark:text-white">Additional Services</p>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-md dark:border-gray-700">
                      <input
                        type="checkbox"
                        id="doorToDoor"
                        name="doorToDoor"
                        checked={additionalServices.doorToDoor}
                        onChange={handleCheckboxChange}
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="doorToDoor" className="cursor-pointer font-medium dark:text-white">
                          Door-to-Door Delivery <span className="text-zim-green dark:text-zim-yellow ml-2">{formatPrice(25)}</span>
                        </Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          We pick up from your address and deliver directly to recipient
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs>
              
              {(activeTab === 'drum' || activeTab === 'other') && (
                <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                  <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700">
                    <span className="font-medium dark:text-white">Base Shipping Cost:</span>
                    <span className="text-lg dark:text-white">{formatPrice(priceDetails.basePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b dark:border-gray-700">
                    <span className="font-medium dark:text-white">Additional Services:</span>
                    <span className="dark:text-white">{formatPrice(priceDetails.additionalCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 font-bold">
                    <span className="dark:text-white">Total Estimated Cost:</span>
                    <span className="text-2xl text-zim-green dark:text-zim-yellow">{formatPrice(priceDetails.totalPrice)}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-8 text-center">
                <Link to="/book-shipment">
                  <Button className="bg-zim-green hover:bg-zim-green/90 text-lg px-8">
                    Book Now <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  This is an estimate. Final pricing may vary based on specific shipping details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute left-0 top-0 w-64 h-64 bg-zim-green/5 dark:bg-zim-green/10 rounded-full -translate-x-1/2 -translate-y-1/2 z-0"></div>
      <div className="absolute right-0 bottom-0 w-80 h-80 bg-zim-yellow/5 dark:bg-zim-yellow/10 rounded-full translate-x-1/3 translate-y-1/3 z-0"></div>
    </section>
  );
};

export default ShippingCalculator;
