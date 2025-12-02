import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, Package, Cylinder, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ShipmentData {
  drums: number;
  boxes: number;
  hasOtherItems: boolean;
  otherItemsDescription?: string;
}

interface ShipmentStepProps {
  data: ShipmentData;
  onChange: (values: Partial<ShipmentData>) => void;
}

const ShipmentStep: React.FC<ShipmentStepProps> = ({ data, onChange }) => {
  const drumPrice = 75;
  const boxPrice = 25;

  const incrementDrums = () => onChange({ drums: data.drums + 1 });
  const decrementDrums = () => onChange({ drums: Math.max(0, data.drums - 1) });
  const incrementBoxes = () => onChange({ boxes: data.boxes + 1 });
  const decrementBoxes = () => onChange({ boxes: Math.max(0, data.boxes - 1) });

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">What are you sending?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the items you want to ship
        </p>
      </div>

      {/* Drums */}
      <div className="bg-muted/30 rounded-lg p-4 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cylinder className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Drums</h3>
              <p className="text-sm text-muted-foreground">200-220 litre capacity</p>
              <p className="text-sm font-medium text-primary">£{drumPrice} each</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={decrementDrums}
              disabled={data.drums === 0}
              className="h-10 w-10"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center text-lg font-semibold">{data.drums}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={incrementDrums}
              className="h-10 w-10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Boxes */}
      <div className="bg-muted/30 rounded-lg p-4 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Boxes & Other Items</h3>
              <p className="text-sm text-muted-foreground">Standard shipping boxes</p>
              <p className="text-sm font-medium text-primary">£{boxPrice} each</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={decrementBoxes}
              disabled={data.boxes === 0}
              className="h-10 w-10"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center text-lg font-semibold">{data.boxes}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={incrementBoxes}
              className="h-10 w-10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Other Items Description */}
      {data.boxes > 0 && (
        <div className="space-y-2">
          <Label htmlFor="otherItems" className="text-sm font-medium">
            Describe your items (optional)
          </Label>
          <Textarea
            id="otherItems"
            placeholder="e.g., clothes, electronics, kitchen items..."
            value={data.otherItemsDescription || ''}
            onChange={(e) => onChange({ otherItemsDescription: e.target.value })}
            className="resize-none"
            rows={3}
          />
        </div>
      )}

      {/* Total Preview */}
      {(data.drums > 0 || data.boxes > 0) && (
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Estimated Total</span>
            <span className="text-2xl font-bold text-primary">
              £{(data.drums * drumPrice) + (data.boxes * boxPrice)}
            </span>
          </div>
        </div>
      )}

      <Alert className="bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Need multiple drop-off addresses? Just let our driver know during collection.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ShipmentStep;
