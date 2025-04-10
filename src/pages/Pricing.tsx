
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Check, HelpCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Pricing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Transparent Pricing
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Affordable shipping rates from the UK to Zimbabwe with volume discounts
              </p>
              <div className="flex justify-center mt-6">
                <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
              </div>
            </div>

            <div className="mt-12">
              <Tabs defaultValue="drums" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="drums">Drum Shipping</TabsTrigger>
                  <TabsTrigger value="parcels">Parcel Shipping</TabsTrigger>
                </TabsList>
                
                <TabsContent value="drums" className="mt-8">
                  <Tabs defaultValue="standard" className="w-full">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
                      <TabsTrigger value="standard">Standard Payment</TabsTrigger>
                      <TabsTrigger value="payLater">Pay Later (30 Days)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="standard">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-6">
                          <h3 className="text-2xl font-bold text-center mb-6">Standard Payment - Drum Shipping Rates</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-1/3">Quantity</TableHead>
                                  <TableHead className="w-1/3">Price per Drum</TableHead>
                                  <TableHead className="w-1/3">Total Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">1 Drum</TableCell>
                                  <TableCell>£260</TableCell>
                                  <TableCell>£260</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">2-4 Drums</TableCell>
                                  <TableCell>£240</TableCell>
                                  <TableCell>£480 - £960</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">5+ Drums</TableCell>
                                  <TableCell>£220</TableCell>
                                  <TableCell>£1,100+</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          
                          <div className="mt-8">
                            <h4 className="text-lg font-semibold mb-4">What's Included:</h4>
                            <ul className="space-y-2">
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>200L Metal/Plastic Drums</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Door-to-door delivery</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Basic shipping insurance</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Tracking & notifications</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Customs clearance handling</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="payLater">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-6">
                          <h3 className="text-2xl font-bold text-center mb-6">Pay Later (30 Days) - Drum Shipping Rates</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-1/3">Quantity</TableHead>
                                  <TableHead className="w-1/3">Price per Drum</TableHead>
                                  <TableHead className="w-1/3">Total Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">1 Drum</TableCell>
                                  <TableCell>£280</TableCell>
                                  <TableCell>£280</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">2-4 Drums</TableCell>
                                  <TableCell>£260</TableCell>
                                  <TableCell>£520 - £1,040</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">5+ Drums</TableCell>
                                  <TableCell>£240</TableCell>
                                  <TableCell>£1,200+</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          
                          <div className="mt-8">
                            <h4 className="text-lg font-semibold mb-4">What's Included:</h4>
                            <ul className="space-y-2">
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>200L Metal/Plastic Drums</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Door-to-door delivery</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Basic shipping insurance</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Tracking & notifications</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-green mr-2" />
                                <span>Customs clearance handling</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-zim-yellow mr-2" />
                                <span>30-day payment terms</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                
                <TabsContent value="parcels" className="mt-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-center mb-6">Parcel Shipping Rates</h3>
                      <p className="text-center mb-6">For all other items not shipped in drums, we charge based on volume:</p>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-8 rounded-lg text-center mb-8">
                        <p className="text-3xl font-bold text-zim-red">£15 per cubic meter</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Minimum charge: £20</p>
                      </div>
                      
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">What's Included:</h4>
                        <ul className="space-y-2">
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-zim-green mr-2" />
                            <span>Door-to-door delivery</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-zim-green mr-2" />
                            <span>Volume-based pricing</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-zim-green mr-2" />
                            <span>Basic shipping insurance</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-zim-green mr-2" />
                            <span>Tracking & notifications</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-5 w-5 text-zim-green mr-2" />
                            <span>Customs clearance handling</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Ship?</h3>
              <Link to="/book-shipment">
                <Button className="bg-zim-red hover:bg-zim-red/90 text-white px-8 py-6 text-lg rounded-md">
                  Book Your Shipment Now
                </Button>
              </Link>
              
              <div className="mt-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg max-w-3xl mx-auto">
                <div className="flex items-center mb-4">
                  <HelpCircle className="h-6 w-6 text-zim-yellow mr-2" />
                  <h4 className="text-lg font-semibold">Need a Custom Quote?</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  For large shipments or special items, contact us for a personalized quote.
                </p>
                <Link to="/contact">
                  <Button variant="outline" className="border-zim-yellow text-zim-yellow hover:bg-zim-yellow/10">
                    Contact for Custom Quote
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
