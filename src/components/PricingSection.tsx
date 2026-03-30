import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Banknote, Package, MessageSquare, Box } from 'lucide-react';

const PricingSection = () => {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState<'uk' | 'ireland'>('uk');

  const ukPrices = {
    fivePlus: { cash: '£240', standard: '£260' },
    twoToFour: { cash: '£250', standard: '£270' },
    one: { cash: '£260', standard: '£280' },
    currency: '£',
    cashDiscount: '£20',
  };

  const irelandPrices = {
    fivePlus: { standard: '€340' },
    twoToFour: { standard: '€350' },
    one: { standard: '€360' },
    currency: '€',
  };

  const trunkPrices = {
    fivePlus: '€200',
    twoToFour: '€210',
    one: '€220',
  };

  const prices = selectedRegion === 'uk' ? ukPrices : irelandPrices;

  return (
    <section className="py-16 md:py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            No hidden fees. Volume discounts available. Shipping from UK & Ireland.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-8 ${selectedRegion === 'ireland' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {/* Drum Shipping Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border-2 border-zim-green">
              <div className="bg-zim-green px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-white" />
                    <h3 className="text-xl font-bold text-white">Drum Shipping</h3>
                  </div>
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Region Selector */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setSelectedRegion('uk')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedRegion === 'uk'
                        ? 'bg-zim-green text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    UK (GBP)
                  </button>
                  <button
                    onClick={() => setSelectedRegion('ireland')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedRegion === 'ireland'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    Ireland (EUR)
                  </button>
                </div>

                {/* Pricing tiers */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">5+ drums</span>
                      <span className="text-sm text-gray-500 ml-2">Best value</span>
                    </div>
                    <span className={`text-2xl font-bold ${selectedRegion === 'uk' ? 'text-zim-green' : 'text-emerald-600'}`}>
                      {selectedRegion === 'uk' ? ukPrices.fivePlus.cash : irelandPrices.fivePlus.standard}
                      <span className="text-sm font-normal text-gray-500">/each</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-semibold text-gray-900 dark:text-white">2-4 drums</span>
                    <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {selectedRegion === 'uk' ? ukPrices.twoToFour.cash : irelandPrices.twoToFour.standard}
                      <span className="text-sm font-normal text-gray-500">/each</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-semibold text-gray-900 dark:text-white">1 drum</span>
                    <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {selectedRegion === 'uk' ? ukPrices.one.cash : irelandPrices.one.standard}
                    </span>
                  </div>
                </div>

                {/* Cash discount callout - UK only */}
                {selectedRegion === 'uk' && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-6">
                    <Banknote className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-amber-800 dark:text-amber-200">Cash prices shown.</span>
                      <span className="text-amber-700 dark:text-amber-300 ml-1">Card adds £20/drum</span>
                    </div>
                  </div>
                )}

                {/* What's included */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Free {selectedRegion === 'uk' ? 'UK' : 'Ireland'} collection
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Insurance included</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Full tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Metal coded seal included</span>
                  </div>
                </div>

                <Button
                  className={`w-full text-lg py-6 h-auto ${
                    selectedRegion === 'uk'
                      ? 'bg-zim-green hover:bg-zim-green/90'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  onClick={() => navigate('/book')}
                >
                  Book Drum Shipping
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Trunk/Storage Box Card - Ireland Only */}
            {selectedRegion === 'ireland' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border-2 border-purple-500">
                <div className="bg-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Box className="h-6 w-6 text-white" />
                      <h3 className="text-xl font-bold text-white">Trunks / Storage Boxes</h3>
                    </div>
                    <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Ireland Only
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Perfect for clothes, household items, and personal belongings. Secure and affordable.
                  </p>

                  {/* Pricing tiers */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">5+ trunks</span>
                        <span className="text-sm text-gray-500 ml-2">Best value</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">
                        {trunkPrices.fivePlus}
                        <span className="text-sm font-normal text-gray-500">/each</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="font-semibold text-gray-900 dark:text-white">2-4 trunks</span>
                      <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {trunkPrices.twoToFour}
                        <span className="text-sm font-normal text-gray-500">/each</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="font-semibold text-gray-900 dark:text-white">1 trunk</span>
                      <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {trunkPrices.one}
                      </span>
                    </div>
                  </div>

                  {/* Optional add-on */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Metal Coded Seal</span>
                      <span className="text-gray-500 ml-1">(optional)</span>
                      <span className="ml-2 font-semibold text-purple-600">+€7/trunk</span>
                    </div>
                  </div>

                  {/* What's included */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Free Ireland collection</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Insurance included</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Full tracking</span>
                    </div>
                  </div>

                  <Button
                    className="w-full text-lg py-6 h-auto bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate('/book')}
                  >
                    Book Trunk Shipping
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Other Items Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
              <div className="bg-gray-800 dark:bg-gray-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Other Items</h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Shipping furniture, appliances, electronics, or commercial goods? We can help with a custom quote.
                </p>

                {/* Item examples */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Furniture</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Appliances</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Electronics</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bulk Orders</span>
                  </div>
                </div>

                {/* What's included */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Personalized quote</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">UK & Ireland collection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Fast response (24h)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Commercial rates available</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-lg py-6 h-auto border-2"
                  onClick={() => navigate('/custom-quote-request')}
                >
                  Get a Free Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                {/* WhatsApp alternative */}
                <div className="mt-4 text-center">
                  <span className="text-sm text-gray-500">or </span>
                  <a
                    href="https://wa.me/447584100552"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zim-green hover:underline"
                  >
                    chat with us on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Door-to-door add-on */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Add Door-to-Door Delivery
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We'll deliver directly to your recipient's address in Zimbabwe
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">+£25</span>
                <span className="text-sm text-gray-500">per address</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
