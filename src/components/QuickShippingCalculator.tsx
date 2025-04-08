
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calculator, Package } from 'lucide-react';
import { useShipping } from '@/contexts/ShippingContext';
import { Link } from 'react-router-dom';

const QuickShippingCalculator = () => {
  const { convertPrice, formatPrice, selectedCurrency } = useShipping();
  const [weight, setWeight] = useState<number>(1);
  const [shipmentType, setShipmentType] = useState<string>('standard');
  const [quote, setQuote] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateShippingCost = () => {
    setIsCalculating(true);
    
    // Base rates in GBP
    const baseRates = {
      standard: 15, // per kg
      express: 25,  // per kg
      drum: 80      // flat rate for a drum
    };
    
    // Calculate cost based on shipment type
    let costInGBP = 0;
    
    if (shipmentType === 'drum') {
      costInGBP = baseRates.drum;
    } else {
      const rate = baseRates[shipmentType as keyof typeof baseRates];
      costInGBP = rate * weight;
    }
    
    // Add handling fee
    costInGBP += 5;
    
    // Simulate network delay
    setTimeout(() => {
      // Convert to selected currency
      const convertedPrice = convertPrice(costInGBP);
      setQuote(convertedPrice);
      setIsCalculating(false);
    }, 600);
  };

  return (
    <Card className="w-full shadow-md border-t-4 border-t-zim-green">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-zim-green" />
          Quick Shipping Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shipment-type">Shipment Type</Label>
            <Select
              value={shipmentType}
              onValueChange={(value) => setShipmentType(value)}
            >
              <SelectTrigger id="shipment-type">
                <SelectValue placeholder="Select shipment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Parcel</SelectItem>
                <SelectItem value="express">Express Parcel</SelectItem>
                <SelectItem value="drum">Shipping Drum (180L)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {shipmentType !== 'drum' && (
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          
          <Button 
            onClick={calculateShippingCost}
            disabled={isCalculating || (weight <= 0 && shipmentType !== 'drum')}
            className="mt-2"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Shipping'}
          </Button>
        </div>
        
        {quote !== null && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">Estimated Shipping Cost:</p>
            <p className="text-xl font-bold text-zim-green">{formatPrice(quote)}</p>
            <p className="text-xs text-gray-500 mt-1">
              *Prices are estimates only and may vary based on actual measurements and destination.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 rounded-b-lg flex justify-center">
        <Button asChild variant="link" className="text-zim-green">
          <Link to="/book-shipment" className="flex items-center gap-1">
            <Package className="h-4 w-4" /> Book Full Shipment
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default QuickShippingCalculator;
