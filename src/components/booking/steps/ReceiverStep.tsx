import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, User, Phone, MapPin, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReceiverData {
  fullName: string;
  phone: string;
  phone2?: string;
  address: string;
  city: string;
}

interface ReceiverStepProps {
  data: ReceiverData;
  onChange: (values: Partial<ReceiverData>) => void;
}

const MAJOR_CITIES = [
  'Harare',
  'Bulawayo',
  'Chitungwiza',
  'Mutare',
  'Gweru',
  'Kwekwe',
  'Kadoma',
  'Masvingo',
  'Chinhoyi',
  'Marondera',
];

const ReceiverStep: React.FC<ReceiverStepProps> = ({ data, onChange }) => {
  const [showSecondPhone, setShowSecondPhone] = useState(!!data.phone2);

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Who's receiving?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Delivery details in Zimbabwe
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium">
          Recipient's Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="fullName"
            placeholder="Tatenda Moyo"
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="receiverPhone" className="text-sm font-medium">
          Phone Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="receiverPhone"
            type="tel"
            placeholder="+263 77 123 4567"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Second Phone (Optional) */}
      {showSecondPhone ? (
        <div className="space-y-2">
          <Label htmlFor="receiverPhone2" className="text-sm font-medium text-muted-foreground">
            Second Phone (optional)
          </Label>
          <Input
            id="receiverPhone2"
            type="tel"
            placeholder="+263 77 765 4321"
            value={data.phone2 || ''}
            onChange={(e) => onChange({ phone2: e.target.value })}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowSecondPhone(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add another number
        </Button>
      )}

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="receiverAddress" className="text-sm font-medium">
          Delivery Address
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            id="receiverAddress"
            placeholder="42 Samora Machel Avenue"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="receiverCity" className="text-sm font-medium">
          Delivery City
        </Label>
        <Input
          id="receiverCity"
          placeholder="Harare"
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          list="cities"
        />
        <datalist id="cities">
          {MAJOR_CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>

      <Alert className="bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Delivery is available in main towns and major cities across Zimbabwe.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ReceiverStep;
