
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Package, Truck, Shield, Star, ArrowRight } from 'lucide-react';

const PricingSection = () => {
  const navigate = useNavigate();

  const handleCustomQuoteRequest = () => {
    navigate('/custom-quote-request');
  };

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Shipping Prices
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Transparent pricing for your shipping needs. Choose the service that works best for you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Drum Shipping */}
          <Card className="relative border-2 border-zim-green bg-white dark:bg-gray-800">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-zim-green text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-zim-green/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Package className="h-8 w-8 text-zim-green" />
              </div>
              <CardTitle className="text-2xl">Drum Shipping</CardTitle>
              <CardDescription>
                200-220L drums shipped safely to Zimbabwe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-zim-green mb-2">
                  £260-£280
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">per drum</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-zim-green mr-3" />
                  <span className="text-sm">Secure drum shipping</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-zim-green mr-3" />
                  <span className="text-sm">Insurance included</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-zim-green mr-3" />
                  <span className="text-sm">Tracking provided</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-zim-green mr-3" />
                  <span className="text-sm">Volume discounts available</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <p>• 5+ drums: £260 each</p>
                <p>• 2-4 drums: £270 each</p>
                <p>• 1 drum: £280</p>
              </div>

              <Button 
                className="w-full bg-zim-green hover:bg-zim-green/90" 
                onClick={() => navigate('/book-shipment')}
              >
                Book Drum Shipping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Custom Quote */}
          <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-blue-500/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Star className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-2xl">Custom Quote</CardTitle>
              <CardDescription>
                For other items and special requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  Custom
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">pricing available</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm">Personalized quote</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm">All item types</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm">Expert consultation</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm">Fast response</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <p>• Electronics & gadgets</p>
                <p>• Clothing & textiles</p>
                <p>• Food & beverages</p>
                <p>• And much more...</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={handleCustomQuoteRequest}
              >
                Request Custom Quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Additional Services */}
          <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-500/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Shield className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle className="text-2xl">Add-on Services</CardTitle>
              <CardDescription>
                Extra services to enhance your shipping experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Metal Coded Seal</span>
                  <span className="font-semibold">£5/drum</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cash Payment Discount</span>
                  <span className="font-semibold text-green-600">-£20/drum</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Insurance Coverage</span>
                  <span className="font-semibold text-green-600">Included</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tracking & Updates</span>
                  <span className="font-semibold text-green-600">Included</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <p>• Secure coded seals for drums</p>
                <p>• Save £20 per drum with cash payment</p>
                <p>• Full insurance coverage included</p>
                <p>• Real-time tracking available</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/book-shipment')}
              >
                Add to Booking
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Need help choosing the right service?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
            >
              Contact Support
            </Button>
            <Button 
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={() => navigate('/book-shipment')}
            >
              Start Booking
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
