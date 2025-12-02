import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, User, Mail, Phone, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SenderData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phone2?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface SenderStepProps {
  data: SenderData;
  onChange: (values: Partial<SenderData>) => void;
}

const SenderStep: React.FC<SenderStepProps> = ({ data, onChange }) => {
  const [showSecondPhone, setShowSecondPhone] = useState(!!data.phone2);

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Who's sending?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll use these details for pickup
        </p>
      </div>

      {/* Name Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="firstName"
              placeholder="John"
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last Name
          </Label>
          <Input
            id="lastName"
            placeholder="Smith"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+44 7700 900000"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Second Phone (Optional) */}
      {showSecondPhone ? (
        <div className="space-y-2">
          <Label htmlFor="phone2" className="text-sm font-medium text-muted-foreground">
            Second Phone (optional)
          </Label>
          <Input
            id="phone2"
            type="tel"
            placeholder="+44 7700 900001"
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
        <Label htmlFor="address" className="text-sm font-medium">
          Pickup Address
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            id="address"
            placeholder="123 High Street"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* City & Postal Code */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium">
            City
          </Label>
          <Input
            id="city"
            placeholder="London"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode" className="text-sm font-medium">
            Postal Code
          </Label>
          <Input
            id="postalCode"
            placeholder="SW1A 1AA"
            value={data.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">e.g., SW1, B1, M1</p>
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium">
          Country
        </Label>
        <Select
          value={data.country}
          onValueChange={(value) => onChange({ country: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="England">England</SelectItem>
            <SelectItem value="Wales">Wales</SelectItem>
            <SelectItem value="Scotland">Scotland</SelectItem>
            <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SenderStep;
