import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import SenderStep from './steps/SenderStep';
import ReceiverStep from './steps/ReceiverStep';
import ShipmentStep from './steps/ShipmentStep';
import SummaryStep from './steps/SummaryStep';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface BookingData {
  sender: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phone2?: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  receiver: {
    fullName: string;
    phone: string;
    phone2?: string;
    address: string;
    city: string;
  };
  shipment: {
    drums: number;
    boxes: number;
    hasOtherItems: boolean;
    otherItemsDescription?: string;
  };
}

const STEPS = [
  { id: 1, title: 'Sender Details', shortTitle: 'Sender' },
  { id: 2, title: 'Receiver Details', shortTitle: 'Receiver' },
  { id: 3, title: 'Shipment Items', shortTitle: 'Items' },
  { id: 4, title: 'Review & Submit', shortTitle: 'Review' },
];

const initialData: BookingData = {
  sender: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phone2: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'England',
  },
  receiver: {
    fullName: '',
    phone: '',
    phone2: '',
    address: '',
    city: '',
  },
  shipment: {
    drums: 0,
    boxes: 0,
    hasOtherItems: false,
    otherItemsDescription: '',
  },
};

interface SimpleBookingFormProps {
  onComplete?: (data: BookingData, trackingNumber: string) => void;
}

const SimpleBookingForm: React.FC<SimpleBookingFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<BookingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const progress = (currentStep / STEPS.length) * 100;

  const updateData = (section: keyof BookingData, values: Partial<BookingData[keyof BookingData]>) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...values },
    }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(
          data.sender.firstName &&
          data.sender.lastName &&
          data.sender.email &&
          data.sender.phone &&
          data.sender.address &&
          data.sender.city &&
          data.sender.postalCode
        );
      case 2:
        return !!(
          data.receiver.fullName &&
          data.receiver.phone &&
          data.receiver.address &&
          data.receiver.city
        );
      case 3:
        return data.shipment.drums > 0 || data.shipment.boxes > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const generateTrackingNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ZS-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const calculateTotal = () => {
    const drumPrice = 75;
    const boxPrice = 25;
    return (data.shipment.drums * drumPrice) + (data.shipment.boxes * boxPrice);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const trackingNumber = generateTrackingNumber();
      
      const shipmentData = {
        tracking_number: trackingNumber,
        status: 'Pending Collection',
        origin: `${data.sender.city}, ${data.sender.country}`,
        destination: `${data.receiver.city}, Zimbabwe`,
        user_id: null,
        metadata: {
          sender: {
            firstName: data.sender.firstName,
            lastName: data.sender.lastName,
            name: `${data.sender.firstName} ${data.sender.lastName}`,
            email: data.sender.email,
            phone: data.sender.phone,
            additionalPhone: data.sender.phone2,
            address: data.sender.address,
            city: data.sender.city,
            postalCode: data.sender.postalCode,
            country: data.sender.country,
          },
          recipient: {
            name: data.receiver.fullName,
            phone: data.receiver.phone,
            additionalPhone: data.receiver.phone2,
            address: data.receiver.address,
            city: data.receiver.city,
          },
          shipment: {
            drums: data.shipment.drums,
            boxes: data.shipment.boxes,
            otherItems: data.shipment.hasOtherItems ? data.shipment.otherItemsDescription : null,
            totalAmount: calculateTotal(),
          },
          bookingType: 'guest',
          createdAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase.from('shipments').insert(shipmentData);

      if (error) throw error;

      toast({
        title: "Booking Submitted!",
        description: `Your tracking number is ${trackingNumber}. We'll be in touch soon.`,
      });

      onComplete?.(data, trackingNumber);
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again or contact us.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {STEPS[currentStep - 1].title}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 transition-colors ${
                  step.id < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.id === currentStep
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className="text-xs hidden sm:block">{step.shortTitle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-xl border p-6 mb-6 shadow-sm">
        {currentStep === 1 && (
          <SenderStep
            data={data.sender}
            onChange={(values) => updateData('sender', values)}
          />
        )}
        {currentStep === 2 && (
          <ReceiverStep
            data={data.receiver}
            onChange={(values) => updateData('receiver', values)}
          />
        )}
        {currentStep === 3 && (
          <ShipmentStep
            data={data.shipment}
            onChange={(values) => updateData('shipment', values)}
          />
        )}
        {currentStep === 4 && (
          <SummaryStep data={data} total={calculateTotal()} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex-1 sm:flex-none"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 sm:flex-none"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Booking'}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SimpleBookingForm;
