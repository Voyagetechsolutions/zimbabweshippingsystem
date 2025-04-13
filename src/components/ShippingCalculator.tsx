
import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight, Package, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const ShippingCalculator = () => {
  const navigate = useNavigate();
  const [shipmentType, setShipmentType] = useState("drum");
  const [drumQuantity, setDrumQuantity] = useState("1");
  const [weight, setWeight] = useState("1");
  const [doorToDoor, setDoorToDoor] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash-collection");
  const [otherItemType, setOtherItemType] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [baseShipmentCost, setBaseShipmentCost] = useState(0);
  const [additionalCost, setAdditionalCost] = useState(0);
  
  // List of common items that can be shipped
  const otherItems = [
    { id: "furniture", name: "Furniture", examples: "Beds, sofas, wardrobes, tables, chairs" },
    { id: "appliances", name: "Appliances", examples: "TVs, fridges, freezers, washing machines" },
    { id: "electronics", name: "Electronics", examples: "Computers, sound systems, gaming consoles" },
    { id: "vehicles", name: "Vehicles & Parts", examples: "Cars, motorbikes, spare parts" },
    { id: "medical", name: "Medical Equipment", examples: "Wheelchairs, hospital beds, supplies" },
    { id: "books", name: "Books & Education", examples: "Textbooks, educational materials" },
    { id: "tools", name: "Tools & Equipment", examples: "Power tools, machinery, gardening equipment" },
    { id: "custom", name: "Other Items", examples: "Request custom quote for special items" }
  ];
  
  // Calculate shipping cost whenever inputs change
  useEffect(() => {
    const calculateCost = () => {
      let cost = 0;
      
      if (shipmentType === "drum") {
        // £100 per drum
        cost = parseInt(drumQuantity) * 100;
        
        // Apply cash on collection discount (10%)
        if (paymentMethod === "cash-collection") {
          cost = cost * 0.9; // 10% discount
        }
      } else if (shipmentType === "other") {
        // £15 per kg with minimum charge of £20
        const weightValue = parseFloat(weight);
        cost = Math.max(weightValue * 15, 20);
      }
      
      setBaseShipmentCost(cost);
      
      // Add door-to-door cost if selected
      const doorToDoorCost = doorToDoor ? 25 : 0;
      
      // Calculate total before payment method adjustment
      let totalBeforePaymentMethod = cost + doorToDoorCost;
      
      // Add metal seal cost (£5) for drums
      if (shipmentType === "drum") {
        totalBeforePaymentMethod += 5;
      }
      
      // Calculate additional cost based on payment method
      let additionalPaymentCost = 0;
      if (paymentMethod === "goods-arriving") {
        additionalPaymentCost = totalBeforePaymentMethod * 0.2; // 20% additional charge
      }
      
      setAdditionalCost(additionalPaymentCost);
      setTotalCost(totalBeforePaymentMethod + additionalPaymentCost);
    };
    
    calculateCost();
  }, [shipmentType, drumQuantity, weight, doorToDoor, paymentMethod]);
  
  // Handle booking button click
  const handleBookNow = () => {
    navigate('/book-shipment');
  };
  
  // Handle custom quote button click
  const handleCustomQuote = () => {
    navigate('/book-shipment?type=custom');
  };

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Shipping Calculator</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Calculate the cost of shipping your items from the UK to Zimbabwe. Choose between our popular 200L drums or get a quote for other items.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="drum" onValueChange={(value) => setShipmentType(value)}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="drum" className="text-sm sm:text-base">
                <Truck className="h-4 w-4 mr-2 hidden sm:inline" />
                Drum Shipping
              </TabsTrigger>
              <TabsTrigger value="other" className="text-sm sm:text-base">
                <Package className="h-4 w-4 mr-2 hidden sm:inline" />
                Other Items
              </TabsTrigger>
            </TabsList>
            
            <Card className="border-t-0 rounded-t-none">
              <CardContent className="p-6">
                <TabsContent value="drum" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="drumQuantity">Number of Drums</Label>
                      <Select
                        value={drumQuantity}
                        onValueChange={setDrumQuantity}
                      >
                        <SelectTrigger id="drumQuantity" className="mt-1.5">
                          <SelectValue placeholder="Select quantity" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'drum' : 'drums'} (200L-220L)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1.5">
                        Each drum has a capacity of 200L-220L and is ideal for clothing, shoes, household items and groceries.
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-2 mt-4">
                      <div className="flex h-5 items-center">
                        <input
                          id="doorToDoor1"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-zim-green focus:ring-zim-green"
                          checked={doorToDoor}
                          onChange={(e) => setDoorToDoor(e.target.checked)}
                        />
                      </div>
                      <div className="ml-2">
                        <Label htmlFor="doorToDoor1" className="cursor-pointer">Add Door-to-Door Delivery in Zimbabwe (+£25)</Label>
                        <p className="text-sm text-gray-500">
                          We'll deliver directly to the recipient's address
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <Label>Payment Method</Label>
                      <RadioGroup 
                        value={paymentMethod} 
                        onValueChange={setPaymentMethod}
                        className="mt-2 space-y-3"
                      >
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="cash-collection" id="cash-collection1" className="mt-1" />
                          <div>
                            <Label htmlFor="cash-collection1" className="cursor-pointer font-medium">Cash on Collection</Label>
                            <p className="text-sm text-gray-600">Pay with cash when we collect your items. <span className="text-green-600 font-medium">10% discount for drums!</span></p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="30-day" id="30-day1" className="mt-1" />
                          <div>
                            <Label htmlFor="30-day1" className="cursor-pointer font-medium">Pay Later (30 Days)</Label>
                            <p className="text-sm text-gray-600">Pay within 30 days by cash, bank transfer, or direct debit</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="goods-arriving" id="goods-arriving1" className="mt-1" />
                          <div>
                            <Label htmlFor="goods-arriving1" className="cursor-pointer font-medium">Pay on Goods Arriving</Label>
                            <p className="text-sm text-gray-600">Pay when your goods arrive in Zimbabwe. <span className="text-yellow-600 font-medium">20% premium applies.</span></p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="other" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="otherItemType">Item Type</Label>
                      <Select
                        value={otherItemType}
                        onValueChange={setOtherItemType}
                      >
                        <SelectTrigger id="otherItemType" className="mt-1.5">
                          <SelectValue placeholder="Select item type" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {otherItemType && otherItemType !== "custom" && (
                        <p className="text-sm text-gray-500 mt-1.5">
                          Examples: {otherItems.find(item => item.id === otherItemType)?.examples}
                        </p>
                      )}
                    </div>
                    
                    {otherItemType && otherItemType !== "custom" ? (
                      <>
                        <div>
                          <Label htmlFor="weight">Weight (kg)</Label>
                          <Input
                            id="weight"
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            min="1"
                            step="0.1"
                            className="mt-1.5"
                          />
                          <p className="text-sm text-gray-500 mt-1.5">
                            Minimum charge applies for items under 1.5kg
                          </p>
                        </div>
                        
                        <div className="flex items-start space-x-2 mt-4">
                          <div className="flex h-5 items-center">
                            <input
                              id="doorToDoor2"
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-zim-green focus:ring-zim-green"
                              checked={doorToDoor}
                              onChange={(e) => setDoorToDoor(e.target.checked)}
                            />
                          </div>
                          <div className="ml-2">
                            <Label htmlFor="doorToDoor2" className="cursor-pointer">Add Door-to-Door Delivery in Zimbabwe (+£25)</Label>
                            <p className="text-sm text-gray-500">
                              We'll deliver directly to the recipient's address
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <Label>Payment Method</Label>
                          <RadioGroup 
                            value={paymentMethod} 
                            onValueChange={setPaymentMethod}
                            className="mt-2 space-y-3"
                          >
                            <div className="flex items-start space-x-2">
                              <RadioGroupItem value="cash-collection" id="cash-collection2" className="mt-1" />
                              <div>
                                <Label htmlFor="cash-collection2" className="cursor-pointer font-medium">Cash on Collection</Label>
                                <p className="text-sm text-gray-600">Pay with cash when we collect your items</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-2">
                              <RadioGroupItem value="30-day" id="30-day2" className="mt-1" />
                              <div>
                                <Label htmlFor="30-day2" className="cursor-pointer font-medium">Pay Later (30 Days)</Label>
                                <p className="text-sm text-gray-600">Pay within 30 days by cash, bank transfer, or direct debit</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-2">
                              <RadioGroupItem value="goods-arriving" id="goods-arriving2" className="mt-1" />
                              <div>
                                <Label htmlFor="goods-arriving2" className="cursor-pointer font-medium">Pay on Goods Arriving</Label>
                                <p className="text-sm text-gray-600">Pay when your goods arrive in Zimbabwe. <span className="text-yellow-600 font-medium">20% premium applies.</span></p>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>
                      </>
                    ) : otherItemType === "custom" ? (
                      <div className="bg-blue-50 p-4 rounded-md">
                        <h3 className="font-medium text-blue-800">Request a Custom Quote</h3>
                        <p className="text-sm text-blue-700 mt-2">
                          For special items, large furniture, vehicles, or anything that requires custom handling, please request a custom quote.
                        </p>
                        <Button 
                          onClick={handleCustomQuote} 
                          className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                          Request Custom Quote
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
                
                {((shipmentType === "drum") || 
                  (shipmentType === "other" && otherItemType && otherItemType !== "custom")) && (
                  <div className="mt-8 pt-6 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Base shipping cost:</span>
                      <span className="font-medium">£{baseShipmentCost.toFixed(2)}</span>
                    </div>
                    
                    {doorToDoor && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Door-to-door delivery:</span>
                        <span className="font-medium">£25.00</span>
                      </div>
                    )}
                    
                    {shipmentType === "drum" && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Mandatory metal seal:</span>
                        <span className="font-medium">£5.00</span>
                      </div>
                    )}
                    
                    {paymentMethod === "cash-collection" && shipmentType === "drum" && (
                      <div className="flex justify-between items-center mb-2 text-green-600">
                        <span>Cash collection discount (10%):</span>
                        <span>-£{(parseInt(drumQuantity) * 100 * 0.1).toFixed(2)}</span>
                      </div>
                    )}
                    
                    {paymentMethod === "goods-arriving" && (
                      <div className="flex justify-between items-center mb-2 text-yellow-600">
                        <span>Pay on arrival premium (20%):</span>
                        <span>+£{additionalCost.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <Separator className="my-3" />
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-lg">Total:</span>
                      <span className="font-bold text-lg">£{totalCost.toFixed(2)}</span>
                    </div>
                    
                    <Button 
                      onClick={handleBookNow} 
                      className="w-full bg-zim-green hover:bg-zim-green/90"
                    >
                      Book Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default ShippingCalculator;
