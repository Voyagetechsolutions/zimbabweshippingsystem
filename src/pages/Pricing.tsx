import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Check, Banknote, Package, ArrowRight, Phone, Truck, Shield } from 'lucide-react';
import { photos } from '@/data/sitePhotos';

const Pricing = () => {
  return (
    <>
      <Helmet>
        <title>Pricing | Zimbabwe Shipping - UK & Ireland Rates</title>
        <meta name="description" content="Transparent pricing for UK & Ireland to Zimbabwe shipping. Drums and trunks with simple flat-rate pricing. Free collection included. No hidden fees." />
        <meta name="keywords" content="Zimbabwe shipping prices, drum shipping cost, trunk shipping Ireland, UK to Zimbabwe rates, Ireland to Zimbabwe pricing" />

        {/* Open Graph */}
        <meta property="og:title" content="Pricing | Zimbabwe Shipping" />
        <meta property="og:description" content="Transparent pricing for UK & Ireland to Zimbabwe shipping. Simple flat-rate pricing." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Pricing | Zimbabwe Shipping" />
        <meta name="twitter:description" content="Transparent pricing for UK & Ireland to Zimbabwe shipping. Simple flat-rate pricing." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-ink py-20 text-white md:py-24">
          <img
            src={photos.drumWarehouse.src}
            alt={photos.drumWarehouse.alt}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/55" />
          <div className="absolute top-0 left-0 right-0 flex h-1">
            <div className="w-1/3 bg-zim-green" />
            <div className="w-1/3 bg-zim-yellow" />
            <div className="w-1/3 bg-zim-red" />
          </div>
          <div className="container relative z-10 mx-auto px-4 text-center">
            <span className="eyebrow !text-zim-yellow">Pricing</span>
            <h1 className="mt-4 font-display text-4xl font-extrabold md:text-5xl lg:text-6xl">
              Simple, honest pricing
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-xl text-gray-300">
              Flat-rate drums, free collection and insurance included. No hidden fees,
              no surprises when your goods arrive.
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

                <div className="grid md:grid-cols-1 gap-8 max-w-lg mx-auto">
                  {/* UK Drum Pricing */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-zim-green rounded-2xl p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Banknote className="h-5 w-5 text-zim-green" />
                      <span className="text-sm font-semibold text-zim-green uppercase tracking-wide">UK Drum Pricing</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Per drum, including free collection across England</p>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                        <div>
                          <span className="font-semibold text-lg">1+ drums</span>
                          <span className="ml-2 text-xs text-zim-green font-medium">PER DRUM</span>
                        </div>
                        <span className="text-3xl font-bold text-zim-green">£280</span>
                      </div>
                    </div>

                    <Link to="/book">
                      <Button className="w-full bg-zim-green hover:bg-zim-green/90 h-12 text-lg">
                        Book Now
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
                  <div className="flex justify-center">
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm w-full max-w-md">
                      <div>
                        <span className="font-semibold text-lg">1+ drums</span>
                        <span className="ml-2 text-xs text-emerald-600 font-medium">PER DRUM</span>
                      </div>
                      <span className="text-3xl font-bold text-emerald-600">€360</span>
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
                        <p className="font-semibold">Door-to-Door Collection</p>
                        <p className="text-sm text-gray-600">We collect from your door — £25 in the UK, €25 in Ireland</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold">£25 / €25</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl md:col-span-2">
                    <div className="flex items-center gap-4">
                      <Truck className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-semibold">Delivery in Zimbabwe</p>
                        <p className="text-sm text-gray-600">
                          Direct to the recipient's address in all major cities and towns — £25 (UK shipments) or €25 (Ireland
                          shipments) per delivery address. We don't deliver to rural areas or small villages; depot collection
                          in Harare, Bulawayo or Mutare is free.
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-bold whitespace-nowrap">£25 / €25</span>
                  </div>
                </div>
              </div>

              {/* Discounts */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-6">Discounts</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-semibold text-green-900">Referral Discount</p>
                    <p className="text-sm text-green-800 mt-1">
                      Refer someone who ships with us and get £20 (UK) or €20 (Ireland) off your next shipment.
                    </p>
                  </div>
                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-semibold text-green-900">Returning Residents</p>
                    <p className="text-sm text-green-800 mt-1">
                      Moving back to Zimbabwe for good? Returning residents get a discount — mention it when booking
                      and we'll also guide you through the returning-resident customs paperwork.
                    </p>
                  </div>
                </div>
              </div>

              {/* Other Items */}
              <div className="bg-gray-900 text-white rounded-2xl p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Shipping Other Items?</h2>
                    <p className="text-gray-400">
                      Furniture, appliances, electronics, cars &amp; vehicles, commercial goods - get a custom quote
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
