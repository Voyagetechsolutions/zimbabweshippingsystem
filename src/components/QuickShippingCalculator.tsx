
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calculator, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

const QuickShippingCalculator = () => {
  const [drums, setDrums] = useState<string>("1");
  const [quote, setQuote] = useState<number | null>(null);

  const calculateShippingCost = () => {
    const drumCount = parseInt(drums);
    let pricePerDrum = 240; // Default to single drum price
    
    // Enhanced volume discounts
    if (drumCount >= 10) {
      pricePerDrum = 200;
    } else if (drumCount >= 5) {
      pricePerDrum = 220;
    } else if (drumCount >= 2) {
      pricePerDrum = 230;
    }
    
    const totalPrice = drumCount * pricePerDrum;
    setQuote(totalPrice);
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drums">Number of Drums</Label>
            <Select
              value={drums}
              onValueChange={(value) => setDrums(value)}
            >
              <SelectTrigger id="drums">
                <SelectValue placeholder="Select number of drums" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'Drum' : 'Drums'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
            <p className="font-medium">Volume Discounts:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>1 Drum: £240 each</li>
              <li>2-4 Drums: £230 each</li>
              <li>5-9 Drums: £220 each</li>
              <li>10+ Drums: £200 each</li>
            </ul>
          </div>
          
          <Button 
            onClick={calculateShippingCost}
            className="w-full bg-zim-green hover:bg-zim-green/90"
          >
            Calculate Shipping
          </Button>
        </div>
        
        {quote !== null && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-600">Estimated Shipping Cost:</p>
            <p className="text-2xl font-bold text-zim-green">£{quote.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">
              *Final price may vary based on specific requirements
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
