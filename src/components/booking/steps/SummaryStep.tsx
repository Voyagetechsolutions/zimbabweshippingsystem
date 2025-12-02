import React from 'react';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Package, Cylinder, Phone, Mail } from 'lucide-react';
import type { BookingData } from '../SimpleBookingForm';

interface SummaryStepProps {
  data: BookingData;
  total: number;
}

const SummaryStep: React.FC<SummaryStepProps> = ({ data, total }) => {
  const drumPrice = 75;
  const boxPrice = 25;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Review Your Booking</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please check everything looks correct
        </p>
      </div>

      {/* Sender Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Sender (UK)</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <p className="font-medium text-foreground">
            {data.sender.firstName} {data.sender.lastName}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span>{data.sender.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{data.sender.phone}</span>
            {data.sender.phone2 && <span>/ {data.sender.phone2}</span>}
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3 mt-0.5" />
            <span>
              {data.sender.address}, {data.sender.city}, {data.sender.postalCode}, {data.sender.country}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Receiver Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Receiver (Zimbabwe)</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <p className="font-medium text-foreground">{data.receiver.fullName}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{data.receiver.phone}</span>
            {data.receiver.phone2 && <span>/ {data.receiver.phone2}</span>}
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3 mt-0.5" />
            <span>
              {data.receiver.address}, {data.receiver.city}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Shipment Items */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Package className="w-4 h-4" />
          <span>Items</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          {data.shipment.drums > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Cylinder className="w-4 h-4 text-primary" />
                <span>Drums (200-220L)</span>
                <span className="text-muted-foreground">× {data.shipment.drums}</span>
              </div>
              <span className="font-medium">£{data.shipment.drums * drumPrice}</span>
            </div>
          )}
          {data.shipment.boxes > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span>Boxes & Other</span>
                <span className="text-muted-foreground">× {data.shipment.boxes}</span>
              </div>
              <span className="font-medium">£{data.shipment.boxes * boxPrice}</span>
            </div>
          )}
          {data.shipment.otherItemsDescription && (
            <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
              {data.shipment.otherItemsDescription}
            </p>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="bg-primary text-primary-foreground rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total Amount</span>
          <span className="text-3xl font-bold">£{total}</span>
        </div>
        <p className="text-sm opacity-80 mt-1">
          Payment collected at pickup
        </p>
      </div>
    </div>
  );
};

export default SummaryStep;
