
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  Package, 
  Clock, 
  DollarSign,
  PoundSign,
  Shield, 
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Hourglass,
  PlusCircle,
  Scale
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Services = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Shipping Services</h1>
              <p className="text-lg text-gray-600 mb-8">
                We offer reliable, affordable, and efficient shipping solutions from the UK to Zimbabwe
              </p>
              <div className="flex justify-center">
                <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Our Complete Service Offerings</h2>
              <p className="text-gray-600 mt-2">Comprehensive shipping solutions for all your needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Drum Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-zim-green/10 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-zim-green" />
                  </div>
                  <CardTitle>Drum Shipping</CardTitle>
                  <CardDescription>
                    Our most popular and cost-effective shipping method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Available with a capacity of 200L-220L</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Ideal for clothing, shoes, household items and groceries</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Secure packaging and weatherproof</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Regular scheduled departures</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/book-shipment">Book Drum Shipping</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Parcel Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-zim-red/10 rounded-full flex items-center justify-center mb-4">
                    <Truck className="h-6 w-6 text-zim-red" />
                  </div>
                  <CardTitle>Other Item Shipping</CardTitle>
                  <CardDescription>
                    Fast and efficient individual parcel delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Competitive pricing</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tracking available for all parcels</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Door-to-door delivery option</span>
                    </li>                    
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/book-shipment">Ship a Parcel</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Door-to-Door Service */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-zim-yellow/10 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-zim-yellow" />
                  </div>
                  <CardTitle>Door-to-Door Service</CardTitle>
                  <CardDescription>
                    Complete convenience from collection to delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Collection from your UK address</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Delivery to any location in Zimbabwe</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>No need to visit our depot</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Real-time tracking and updates</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/book-shipment">Book Door-to-Door</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Customs Clearance */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Customs Clearance</CardTitle>
                  <CardDescription>
                    Hassle-free importing into Zimbabwe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Expert handling of customs documentation</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Duty payment handling</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Compliance with local regulations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Avoid delays and complications</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/contact">Inquire About Customs</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Commercial Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Commercial Shipping</CardTitle>
                  <CardDescription>
                    Specialized solutions for businesses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Volume discounts for regular shipments</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Business-to-business delivery</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Commercial invoice handling</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tailored shipping schedules</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/contact">Business Inquiries</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Express Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Express Shipping</CardTitle>
                  <CardDescription>
                    Faster delivery for urgent items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Priority handling and shipping</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Faster transit times (2-3 weeks)</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Enhanced tracking services</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Available for critical documents</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/contact">Request Express Service</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Shipping Guidelines and Restrictions */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Shipping Guidelines and Restrictions</h2>
              <p className="text-gray-600 mt-2">Important information about what you can and cannot ship</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Allowed Items */}
              <Card className="bg-white shadow-lg">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
                    <CardTitle className="text-green-700">Allowed Items</CardTitle>
                  </div>
                  <CardDescription>
                    These items are acceptable for shipping
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Clothing & Textiles:</strong> All types of clothing, shoes, bags, bedding, towels, and fabrics.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Food Items:</strong> Non-perishable, commercially packaged food (canned goods, dried foods, pasta, etc.) with clear labeling.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Household Goods:</strong> Kitchenware, small appliances, decor items, toys, books, and stationery.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Electronics:</strong> Phones, laptops, tablets, cameras, and other personal electronics (for personal use only).</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Personal Care:</strong> Toiletries, cosmetics (non-aerosol), and hygiene products (in original packaging).</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Medical Items:</strong> Non-prescription medicines, first aid supplies, vitamins, and supplements (in original packaging).</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Tools:</strong> Hand tools, small power tools, and gardening equipment (no fuel-powered tools).</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* Restricted Items */}
              <Card className="bg-white shadow-lg">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
                    <CardTitle className="text-orange-700">Restricted Items</CardTitle>
                  </div>
                  <CardDescription>
                    These items require special permission or handling
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Batteries:</strong> Only when installed in devices. Loose batteries must be declared and specially packaged.</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Perfumes:</strong> Limited quantities (max 100ml per bottle, 2 bottles total). Must be declared.</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Liquids:</strong> Must be securely sealed and limited to 1L total. Proper packaging required to prevent leakage.</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Prescription Medicines:</strong> Limited quantities for personal use only. Documentation required.</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Valuable Items:</strong> Jewelry, watches, and high-value electronics must be declared and insured.</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Commercial Goods:</strong> Items intended for resale require commercial documentation and may be subject to additional duties.</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Auto Parts:</strong> Limited quantities allowed. Must be declared and properly packaged.</span>
                    </li>
                  </ul>
                  <div className="mt-4 bg-orange-50 p-4 rounded-md">
                    <p className="text-orange-800 text-sm">
                      <strong>Important:</strong> All restricted items must be declared at booking. Failure to declare may result in confiscation or shipment delays.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Prohibited Items */}
              <Card className="bg-white shadow-lg">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center mb-2">
                    <XCircle className="h-6 w-6 text-red-600 mr-2" />
                    <CardTitle className="text-red-700">Prohibited Items</CardTitle>
                  </div>
                  <CardDescription>
                    These items are not allowed for shipping
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Illegal Substances:</strong> Narcotics, illegal drugs, and controlled substances.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Weapons & Ammunition:</strong> Firearms, ammunition, knives, explosives, or weapon parts.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Flammable Materials:</strong> Fuels, lighter fluid, matches, certain chemicals.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Aerosols:</strong> Spray paints, insecticides, hair sprays, deodorants.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Perishable Foods:</strong> Fresh fruits, vegetables, meat, fish, dairy products.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Plants & Seeds:</strong> Live plants, seeds, soil, or plant materials.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Currency & Valuables:</strong> Cash, bearer bonds, precious metals, loose gemstones.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Hazardous Materials:</strong> Corrosives, oxidizers, radioactive materials, toxic substances.</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Counterfeit Goods:</strong> Fake branded items, pirated media.</span>
                    </li>
                  </ul>
                  <div className="mt-4 bg-red-50 p-4 rounded-md">
                    <p className="text-red-800 text-sm">
                      <strong>Warning:</strong> Attempting to ship prohibited items may result in confiscation, penalties, and potential legal action. Zimbabwe Shipping reserves the right to inspect all packages.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Packing Guidelines */}
            <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold">Packing Guidelines</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <PlusCircle className="h-5 w-5 text-zim-green mr-2" />
                    <h4 className="font-semibold">Drum Packing</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Maximize space by rolling clothes tightly. Place heavier items at the bottom. 
                    Place fragile items in the center surrounded by soft items for protection.
                  </p>
                </div>
                
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <Scale className="h-5 w-5 text-zim-yellow mr-2" />
                    <h4 className="font-semibold">Weight Limits</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Small drum: 40kg max<br />
                    Medium drum: 60kg max<br />
                    Large drum: 80kg max<br />
                    Parcels: 30kg per package
                  </p>
                </div>
                
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                    <h4 className="font-semibold">Fragile Items</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Wrap each fragile item individually in bubble wrap. 
                    Mark packages containing fragile items clearly. Consider additional insurance for valuable fragile items.
                  </p>
                </div>
                
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <Hourglass className="h-5 w-5 text-zim-red mr-2" />
                    <h4 className="font-semibold">Liquids</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Double seal all liquids in ziplock bags. Wrap bottles in absorbent material. 
                    Ensure bottles are tightly sealed. Pack away from electronics and documents.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <Button asChild>
                  <Link to="/book-shipment">Book Your Shipment Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Service Process */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Our Service Process</h2>
              <p className="text-gray-600 mt-2">Simple steps to ship your items to Zimbabwe</p>
            </div>
            
            <div className="relative">
              {/* Process Steps */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-green flex items-center justify-center text-white text-xl font-bold mb-4 z-10">1</div>
                  <h3 className="text-lg font-semibold mb-2">Book Your Shipment</h3>
                  <p className="text-gray-600">Select your service and schedule pickup or drop-off</p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-yellow flex items-center justify-center text-white text-xl font-bold mb-4 z-10">2</div>
                  <h3 className="text-lg font-semibold mb-2">We Collect</h3>
                  <p className="text-gray-600">We collect your items from your location or receive them at our depot</p>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-red flex items-center justify-center text-white text-xl font-bold mb-4 z-10">3</div>
                  <h3 className="text-lg font-semibold mb-2">Transit to Zimbabwe</h3>
                  <p className="text-gray-600">Your shipment travels securely to Zimbabwe with tracking updates</p>
                </div>
                
                {/* Step 4 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-4 z-10">4</div>
                  <h3 className="text-lg font-semibold mb-2">Delivery</h3>
                  <p className="text-gray-600">We deliver to your recipient's address in Zimbabwe</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-zim-green/90 to-zim-green">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Ship to Zimbabwe?</h2>
            <p className="text-white text-lg max-w-2xl mx-auto mb-8">
              Book your shipment today and experience our reliable service from the UK to Zimbabwe
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-zim-green hover:bg-gray-100">
                <Link to="/book-shipment">Book a Shipment</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
