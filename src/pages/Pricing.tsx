import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Check, Banknote, Package, ArrowRight, Phone, Truck, Shield } from 'lucide-react';

const Pricing = () => {
  return (
    <>
      <Helmet>
        <title>Pricing | Zimbabwe Shipping - Drums from £240</title>
        <meta name="description" content="Transparent pricing for UK to Zimbabwe shipping. Drums from £240 with cash discount. Volume discounts available. Free UK collection included." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              No hidden fees. Volume discounts available. Pay with cash and save even more.
            </p>
          </div>
        </section>

        {/* Main Pricing */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {/* Drum Pricing */}
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-zim-green/10 rounded-xl">
                    <Package className="h-8 w-8 text-zim-green" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Drum Shipping</h2>
                    <p className="text-gray-600">Our most popular service - 200-220L drums</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Cash Price */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-zim-green rounded-2xl p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Banknote className="h-5 w-5 text-zim-green" />
                      <span className="text-sm font-semibold text-zim-green uppercase tracking-wide">Cash Payment</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Pay cash on collection and save £20 per drum</p>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <div>
                          <span className="font-semibold text-lg">5+ drums</span>
                          <span className="ml-2 text-xs text-zim-green font-medium">BEST VALUE</span>
                        </div>
                        <span className="text-3xl font-bold text-zim-green">£240</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <span className="font-semibold text-lg">2-4 drums</span>
                        <span className="text-2xl font-bold text-gray-700">£250</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <span className="font-semibold text-lg">1 drum</span>
                        <span className="text-2xl font-bold text-gray-700">£260</span>
                      </div>
                    </div>

                    <Link to="/book">
                      <Button className="w-full bg-zim-green hover:bg-zim-green/90 h-12 text-lg">
                        Book with Cash Price
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>

                  {/* Standard Price */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Standard Payment</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Card payment or 30-day terms available</p>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <span className="font-semibold text-lg">5+ drums</span>
                        <span className="text-2xl font-bold text-gray-700">£260</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <span className="font-semibold text-lg">2-4 drums</span>
                        <span className="text-2xl font-bold text-gray-700">£270</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <span className="font-semibold text-lg">1 drum</span>
                        <span className="text-2xl font-bold text-gray-700">£280</span>
                      </div>
                    </div>

                    <Link to="/book">
                      <Button variant="outline" className="w-full h-12 text-lg border-2">
                        Book Standard
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Pay on Arrival */}
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-amber-900">Pay on Goods Arriving</h3>
                      <p className="text-amber-700 text-sm">Pay when your goods arrive in Zimbabwe - 20% premium applies</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-700">Example: 1 drum = £336</p>
                      <p className="text-xs text-amber-600">(£280 + 20%)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ireland Pricing */}
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Package className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Ireland to Zimbabwe</h2>
                    <p className="text-gray-600">Drum shipping from Ireland - prices in Euro</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-500 rounded-2xl p-8">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                      <div>
                        <span className="font-semibold text-lg">5+ drums</span>
                        <span className="ml-2 text-xs text-emerald-600 font-medium">BEST VALUE</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">€340</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                      <span className="font-semibold text-lg">2-4 drums</span>
                      <span className="text-2xl font-bold text-gray-700">€350</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                      <span className="font-semibold text-lg">1 drum</span>
                      <span className="text-2xl font-bold text-gray-700">€360</span>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-700 mt-4 text-center">
                    Free collection throughout Ireland. Same great service, local currency pricing.
                  </p>
                </div>
              </div>

              {/* What's Included */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-6">What's Included</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span>Free UK collection</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span>Full insurance</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span>Tracking included</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span>Customs handling</span>
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-6">Additional Services</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <Shield className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-semibold">Metal Coded Seal</p>
                        <p className="text-sm text-gray-600">Security seal for your drum</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold">£5</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <Truck className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-semibold">Door-to-Door Delivery</p>
                        <p className="text-sm text-gray-600">Direct to recipient's address</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold">£25</span>
                  </div>
                </div>
              </div>

              {/* Other Items */}
              <div className="bg-gray-900 text-white rounded-2xl p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Shipping Other Items?</h2>
                    <p className="text-gray-400">
                      Furniture, appliances, electronics, commercial goods - get a custom quote
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/custom-quote-request">
                      <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                        Get a Quote
                      </Button>
                    </Link>
                    <a href="tel:+447584100552">
                      <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                        <Phone className="mr-2 h-5 w-5" />
                        Call Us
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default Pricing;
