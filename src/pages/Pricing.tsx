
import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Info, Package, Box, Sofa, Bike, Tv, WashingMachine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const Pricing = () => {
  const itemCategories = {
    "Vehicles & Mobility": [
      "Bicycle", 
      "Wheelchair", 
      "Adult Walking Aid", 
      "Mobility Scooter", 
      "Car Wheels/Tyres",
      "Vehicle Parts",
      "Engine"
    ],
    "Household Items": [
      "Bin", 
      "Plastic Tubs", 
      "Washing Machine", 
      "Dishwasher", 
      "Dryer", 
      "Ironing Board",
      "Boxes", 
      "Bags", 
      "Suitcase",
      "American Fridge", 
      "Standard Fridge Freezer", 
      "Deep Freezer",
      "Heater",
      "Air Conditioner"
    ],
    "Furniture": [
      "Sofas", 
      "Chairs", 
      "Kids Push Chair", 
      "Dining Chairs", 
      "Dining Table", 
      "Coffee Table", 
      "Beds", 
      "Mattress", 
      "Dismantled Wardrobe", 
      "Chest of Drawers", 
      "Dressing Unit"
    ],
    "Home Decor": [
      "Rugs/Carpets", 
      "Wall Frames", 
      "Mirror",
      "TVs"
    ],
    "Tools & Equipment": [
      "Tool Box", 
      "Air Compressor", 
      "Generator", 
      "Solar Panels", 
      "Garden Tools", 
      "Lawn Mower", 
      "Bathroom Equipment",
      "Water Pump",
      "Building Equipment",
      "Ladder"
    ],
    "Construction": [
      "Internal Doors", 
      "External Doors", 
      "Pallet"
    ],
    "Business & Office": [
      "Office Equipment",
      "Amazon Bags", 
      "Changani Bags"
    ]
  };

  return (
    <>
      <Navbar />
      <main className="py-16 container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">Shipping Prices</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Competitive rates for shipping from the UK to Zimbabwe
            </p>
          </div>
          
          <Tabs defaultValue="drum" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="drum">Drum Shipping</TabsTrigger>
              <TabsTrigger value="other">Other Items</TabsTrigger>
            </TabsList>
            
            <TabsContent value="drum">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Discounted Offer</CardTitle>
                      <CardDescription>Only Available for cash on collection option</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">1 Drum</span>
                        <span className="text-xl font-bold">£260</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">2-4 Drums</span>
                        <span className="text-xl font-bold">£240 <span className="text-sm font-normal">per drum</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">5+ Drums</span>
                        <span className="text-xl font-bold">£220 <span className="text-sm font-normal">per drum</span></span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link to="/book-shipment" className="w-full">
                        <Button className="w-full bg-zim-green hover:bg-zim-green/90">Book Now</Button>
                      </Link>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Standard Rates </CardTitle>
                      <CardDescription>Drum prices</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">1 Drum</span>
                        <span className="text-xl font-bold">£280</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">2-4 Drums</span>
                        <span className="text-xl font-bold">£260 <span className="text-sm font-normal">per drum</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">5+ Drums</span>
                        <span className="text-xl font-bold">£240 <span className="text-sm font-normal">per drum</span></span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link to="/book-shipment" className="w-full">
                        <Button className="w-full bg-zim-green hover:bg-zim-green/90">Book Now</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                  
                
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Pay on Goods Arriving</CardTitle>
                    <CardDescription>Pay when your goods arrive in Zimbabwe</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertTitle>20% Premium</AlertTitle>
                      <AlertDescription>
                        This option includes a 20% premium on the standard rates
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-md p-4">
                        <div className="text-lg font-medium mb-2">1 Drum</div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b">
                          <span>Base Price</span>
                          <span>£280</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b">
                          <span>Premium (20%)</span>
                          <span>£56</span>
                        </div>
                        <div className="flex justify-between items-center font-bold pt-1">
                          <span>Total</span>
                          <span>£336</span>
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="text-lg font-medium mb-2">2-4 Drums</div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b">
                          <span>Base Price</span>
                          <span>£260 per drum</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b">
                          <span>Premium (20%)</span>
                          <span>£52 per drum</span>
                        </div>
                        <div className="flex justify-between items-center font-bold pt-1">
                          <span>Total</span>
                          <span>£312 per drum</span>
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="text-lg font-medium mb-2">5+ Drums</div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b">
                          <span>Base Price</span>
                          <span>£240 per drum</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pb-2 border-b">
                          <span>Premium (20%)</span>
                          <span>£48 per drum</span>
                        </div>
                        <div className="flex justify-between items-center font-bold pt-1">
                          <span>Total</span>
                          <span>£288 per drum</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link to="/book-shipment" className="w-full">
                      <Button className="w-full bg-zim-red hover:bg-zim-red/90">Book Now</Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="other">
              <div className="space-y-8">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Volume-Based Pricing</AlertTitle>
                  <AlertDescription>
                    Pricing for other items is based on volume/size. Contact us for a custom quote at +44 7584 100552.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Package className="mr-2 h-5 w-5" />
                        Items We Ship
                      </CardTitle>
                      <CardDescription>
                        Browse through our accepted items by category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {Object.entries(itemCategories).map(([category, items], index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="font-medium">
                              {category}
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4">
                                {items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="flex items-center">
                                    <Check className="h-4 w-4 text-zim-green mr-2" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Request a Custom Quote</CardTitle>
                        <CardDescription>
                          Not sure about pricing for your item? Request a custom quote.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                          Our team will assess your items and provide you with a personalized quote based on volume and shipping requirements.
                        </p>
                        <div className="space-y-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 bg-blue-50 rounded-full p-2 mr-3">
                              <Box className="h-5 w-5 text-blue-700" />
                            </div>
                            <div>
                              <h4 className="font-medium">Accurate Assessment</h4>
                              <p className="text-sm text-gray-600">We'll carefully evaluate your items to provide the most accurate quote</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 bg-green-50 rounded-full p-2 mr-3">
                              <Check className="h-5 w-5 text-green-700" />
                            </div>
                            <div>
                              <h4 className="font-medium">Quick Response</h4>
                              <p className="text-sm text-gray-600">Receive your custom quote within 24 hours</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Link to="/book-shipment" className="w-full">
                          <Button className="w-full">Request Quote</Button>
                        </Link>
                      </CardFooter>
                    </Card>
                    
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">Need Help?</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-green-800">
                          Our team is ready to assist you with any questions about shipping your items to Zimbabwe.
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Link to="/contact" className="w-full">
                          <Button variant="outline" className="w-full border-green-600 text-green-800 hover:bg-green-100">
                            Contact Us
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Additional Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Mandatory Metal Coded Seal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">For increased security, all drums and suitcases include a metal coded seal.</p>
                  <div className="flex justify-between items-center font-medium">
                    <span>Price per coded seal</span>
                    <span>£5.00</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Door-to-Door Delivery</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Optional service for direct delivery to recipient's address in Zimbabwe.</p>
                  <div className="flex justify-between items-center font-medium">
                    <span>Price per address</span>
                    <span>£25.00</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Ship?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Book your shipment today and enjoy our reliable service from the UK to Zimbabwe.
            </p>
            <Link to="/book-shipment">
              <Button size="lg" className="bg-zim-green hover:bg-zim-green/90">
                Book Your Shipment Now
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default Pricing;
