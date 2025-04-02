
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, TrendingDown } from 'lucide-react';

type ShippingOption = {
  id: string;
  name: string;
  price: number;
  deliveryTime: string;
  description: string;
};

const ShippingCalculator: React.FC = () => {
  const [weight, setWeight] = useState<number>(1);
  const [packageType, setPackageType] = useState<'parcel' | 'drum'>('parcel');
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const shippingOptions: ShippingOption[] = [
    {
      id: 'standard',
      name: 'Standard Shipping',
      price: packageType === 'drum' ? 260 : 50 * weight,
      deliveryTime: '2-3 weeks',
      description: 'Our most economical shipping option with standard tracking'
    },
    {
      id: 'express',
      name: 'Express Shipping',
      price: packageType === 'drum' ? 350 : 75 * weight,
      deliveryTime: '10-14 days',
      description: 'Faster delivery with priority handling and tracking'
    },
    {
      id: 'premium',
      name: 'Premium Shipping',
      price: packageType === 'drum' ? 450 : 100 * weight,
      deliveryTime: '7-10 days',
      description: 'Our fastest option with premium service and insurance included'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setShowResults(false);
    
    // Simulate API call
    setTimeout(() => {
      setIsCalculating(false);
      setShowResults(true);
    }, 1000);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Shipping Rate Calculator</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get an estimate for shipping your package from the UK to Zimbabwe based on weight and package type.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="border-zim-green shadow-lg">
            <CardHeader className="bg-zim-green/10">
              <CardTitle className="flex items-center text-2xl">
                <DollarSign className="mr-2 h-6 w-6 text-zim-green" /> 
                Calculate Shipping Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Package Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          packageType === 'parcel' 
                            ? 'border-zim-green bg-zim-green/10 shadow-md' 
                            : 'border-gray-200 hover:border-zim-green/50'
                        }`}
                        onClick={() => setPackageType('parcel')}
                      >
                        <div className="flex flex-col items-center">
                          <Package className={`h-8 w-8 ${packageType === 'parcel' ? 'text-zim-green' : 'text-gray-400'}`} />
                          <span className="mt-2 font-medium">Parcel</span>
                        </div>
                      </div>
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          packageType === 'drum' 
                            ? 'border-zim-green bg-zim-green/10 shadow-md' 
                            : 'border-gray-200 hover:border-zim-green/50'
                        }`}
                        onClick={() => setPackageType('drum')}
                      >
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                            className={`h-8 w-8 ${packageType === 'drum' ? 'text-zim-green' : 'text-gray-400'}`}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2v20M2 12h20" />
                          </svg>
                          <span className="mt-2 font-medium">Drum</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {packageType === 'parcel' && (
                    <div>
                      <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (kg)
                      </label>
                      <div className="flex">
                        <button 
                          type="button"
                          className="bg-gray-200 text-gray-600 hover:bg-gray-300 px-3 py-2 rounded-l-md"
                          onClick={() => setWeight(prev => Math.max(1, prev - 1))}
                        >
                          -
                        </button>
                        <input
                          id="weight"
                          type="number"
                          min="1"
                          value={weight}
                          onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
                          className="w-full text-center px-3 py-2 border-y border-gray-300 focus:outline-none"
                        />
                        <button 
                          type="button"
                          className="bg-gray-200 text-gray-600 hover:bg-gray-300 px-3 py-2 rounded-r-md"
                          onClick={() => setWeight(prev => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full md:w-auto bg-zim-green hover:bg-zim-green/90"
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </div>
                  ) : (
                    'Calculate Shipping Cost'
                  )}
                </Button>
              </form>
              
              {showResults && (
                <div className="mt-8 animate-fade-in">
                  <h3 className="text-xl font-semibold mb-4">Shipping Options</h3>
                  <div className="space-y-4">
                    {shippingOptions.map((option) => (
                      <div 
                        key={option.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div>
                            <h4 className="font-semibold text-lg">{option.name}</h4>
                            <p className="text-gray-600 text-sm mb-2">{option.description}</p>
                            <div className="flex items-center text-sm text-gray-500">
                              <span className="mr-4">Delivery: {option.deliveryTime}</span>
                              {option.id === 'standard' && (
                                <span className="flex items-center text-zim-green">
                                  <TrendingDown className="h-4 w-4 mr-1" /> Best Value
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 md:mt-0 flex flex-col md:items-end">
                            <span className="text-2xl font-bold">£{option.price}</span>
                            <Button 
                              size="sm" 
                              className="mt-2 bg-zim-green hover:bg-zim-green/90"
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 text-sm">
                    <p className="text-gray-600">
                      Note: These prices are estimates and may vary based on the exact dimensions, weight, and contents of your package. 
                      Additional fees may apply for customs clearance.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ShippingCalculator;
