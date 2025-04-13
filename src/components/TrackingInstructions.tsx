
import React from 'react';
import { CheckCircle } from 'lucide-react';

const TrackingInstructions = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold mb-2">How to Track Your Shipment</h3>
      
      <div className="space-y-3">
        <div className="flex">
          <div className="mr-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zim-green text-white">
              1
            </div>
          </div>
          <div>
            <p className="font-medium">Find your tracking number</p>
            <p className="text-sm text-gray-600">
              Your tracking number can be found in your confirmation email or receipt from Zimbabwe Shipping.
            </p>
          </div>
        </div>
        
        <div className="flex">
          <div className="mr-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zim-green text-white">
              2
            </div>
          </div>
          <div>
            <p className="font-medium">Enter the tracking number</p>
            <p className="text-sm text-gray-600">
              Enter your tracking number in the field above and click "Track Shipment".
            </p>
          </div>
        </div>
        
        <div className="flex">
          <div className="mr-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zim-green text-white">
              3
            </div>
          </div>
          <div>
            <p className="font-medium">View shipment details</p>
            <p className="text-sm text-gray-600">
              You'll be able to see the current status, origin, destination, and estimated delivery date of your shipment.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-md mt-4">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-zim-green mr-2 mt-0.5" />
          <div>
            <p className="font-medium">Need Help?</p>
            <p className="text-sm text-gray-600">
              If you need assistance tracking your shipment, please call us at <span className="text-zim-green">+44 7584 100552</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingInstructions;
