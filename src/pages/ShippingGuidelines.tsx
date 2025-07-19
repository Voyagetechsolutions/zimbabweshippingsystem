
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Package, Shield, Truck } from 'lucide-react';
import { Helmet } from 'react-helmet';

const ShippingGuidelines = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Shipping Guidelines & Restrictions | Zimbabwe Shipping Services</title>
        <meta
          name="description"
          content="Important information about what you can and cannot ship from the UK to Zimbabwe. Learn about our shipping guidelines, restrictions, and packing requirements."
        />
        <meta name="keywords" content="shipping guidelines, shipping restrictions, Zimbabwe shipping, what to ship, prohibited items" />
      </Helmet>

      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Shipping Guidelines and Restrictions</h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Important information about what you can and cannot ship
              </p>
            </div>
          </div>
        </section>

        {/* Allowed Items Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Allowed Items</h2>
                  <p className="text-gray-600">These items are acceptable for shipping</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Clothing & Textiles</h3>
                    <p className="text-gray-600">All types of clothing, shoes, bags, bedding, towels, and fabrics etc.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Food Items</h3>
                    <p className="text-gray-600">Non-perishable, commercially packaged food (canned goods, dried foods, pasta, etc.) with clear labeling etc.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Household Goods</h3>
                    <p className="text-gray-600">Kitchenware, small appliances, decor items, toys, books, and stationery etc.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Electronics</h3>
                    <p className="text-gray-600">Phones, laptops, tablets, cameras, and other personal electronics (for personal use only) etc.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Personal Care</h3>
                    <p className="text-gray-600">Toiletries, cosmetics (non-aerosol), and hygiene products (in original packaging) etc.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Medical Items</h3>
                    <p className="text-gray-600">Non-prescription medicines, first aid supplies, vitamins, and supplements (in original packaging) etc.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Tools</h3>
                    <p className="text-gray-600">Hand tools, small power tools, and gardening equipment (no fuel-powered tools) etc.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Perfumes & Aerosols</h3>
                    <p className="text-gray-600">Spray paints, insecticides, hair sprays, deodorants.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Restricted Items Section */}
        <section className="py-16 bg-yellow-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Restricted Items</h2>
                  <p className="text-gray-600">These items require special permission or handling</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-lg mb-3">Batteries</h3>
                  <p className="text-gray-600">Only when installed in devices. Loose batteries must be declared and specially packaged.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-lg mb-3">Liquids</h3>
                  <p className="text-gray-600">Must be securely sealed and proper packaging required to prevent leakage.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-lg mb-3">Valuable Items</h3>
                  <p className="text-gray-600">Jewelry, watches, and high-value goods must be declared and insured.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-lg mb-3">Commercial Goods</h3>
                  <p className="text-gray-600">Items intended for resale require commercial documentation and may be subject to additional duties.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-lg mb-3">Auto Parts</h3>
                  <p className="text-gray-600">Must be declared and properly packaged.</p>
                </div>
              </div>

              <div className="mt-8 bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">
                  <strong>Important:</strong> All restricted items must be declared at booking. Failure to declare may result in confiscation or shipment delays.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prohibited Items Section */}
        <section className="py-16 bg-red-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Prohibited Items</h2>
                  <p className="text-gray-600">These items are not allowed for shipping</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Illegal Substances</h3>
                  <p className="text-gray-600">Narcotics, illegal drugs, and controlled substances.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Weapons & Ammunition</h3>
                  <p className="text-gray-600">Firearms, ammunition, explosives, or weapon parts.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Flammable Materials</h3>
                  <p className="text-gray-600">Fuels, lighter fluid, matches, certain chemicals.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Perishable Foods</h3>
                  <p className="text-gray-600">Fresh fruits, vegetables, meat, fish, dairy products.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Plants & Seeds</h3>
                  <p className="text-gray-600">Live plants, seeds, soil, or plant materials.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Currency & Valuables</h3>
                  <p className="text-gray-600">Cash, bearer bonds, precious metals, loose gemstones.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Hazardous Materials</h3>
                  <p className="text-gray-600">Corrosives, oxidizers, radioactive materials, toxic substances.</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 border border-red-200">
                  <h3 className="font-semibold text-lg mb-3">Counterfeit Goods</h3>
                  <p className="text-gray-600">Fake branded items, pirated media.</p>
                </div>
              </div>

              <div className="mt-8 bg-red-100 border border-red-300 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  <strong>Warning:</strong> Attempting to ship prohibited items may result in confiscation, penalties, and potential legal action. Zimbabwe Shipping reserves the right to inspect all packages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Packing Guidelines Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Packing Guidelines</h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Drum Packing</h3>
                  <p className="text-gray-600">Maximize space by rolling clothes tightly. Place heavier items at the bottom. Place fragile items in the center surrounded by soft items for protection.</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Fragile Items</h3>
                  <p className="text-gray-600">Wrap each fragile item individually in bubble wrap. Mark packages containing fragile items clearly. Consider additional insurance for valuable fragile items.</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Truck className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Liquids</h3>
                  <p className="text-gray-600">Double seal all liquids in ziplock bags. Wrap bottles in absorbent material. Ensure bottles are tightly sealed. Pack away from electronics and documents.</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Best Practices</h3>
                  <p className="text-gray-600">Label all items clearly. Keep inventory list. Take photos before packing. Use quality packing materials for protection.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-zim-green text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Ship?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Now that you know our guidelines, book your shipment and we'll handle the rest
            </p>
            <Button asChild size="lg" variant="outline" className="bg-white text-zim-green hover:bg-gray-100">
              <Link to="/book-shipment">Book Your Shipment Now</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ShippingGuidelines;
