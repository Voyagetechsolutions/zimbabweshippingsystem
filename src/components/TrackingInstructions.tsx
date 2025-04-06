
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FileText, Truck, Search, ArrowRight } from 'lucide-react';

const TrackingInstructions = () => {
  return (
    <Card className="border shadow-md">
      <CardHeader className="bg-gray-50 dark:bg-gray-800">
        <CardTitle className="text-xl flex items-center">
          <Package className="mr-2 h-5 w-5 text-zim-green" />
          How to Track Your Shipment
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-zim-green" />
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-zim-green text-white flex items-center justify-center text-sm font-medium">1</div>
              </div>
              <div className="h-full w-0.5 bg-gray-200 absolute left-5 top-10 bottom-0 z-0"></div>
            </div>
            <div className="pb-6">
              <h3 className="font-medium text-lg mb-2">Find Your Tracking Number</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your tracking number can be found in your email confirmation, receipt, or in your account dashboard.
                It typically looks like this: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">ZIM12345UK</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
                <Search className="h-5 w-5 text-zim-green" />
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-zim-green text-white flex items-center justify-center text-sm font-medium">2</div>
              </div>
              <div className="h-full w-0.5 bg-gray-200 absolute left-5 top-10 bottom-0 z-0"></div>
            </div>
            <div className="pb-6">
              <h3 className="font-medium text-lg mb-2">Enter Your Tracking Number</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your tracking number in the search box above and click "Track" to see the current status of your shipment.
                Make sure to enter the full tracking number without any spaces.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
                <Truck className="h-5 w-5 text-zim-green" />
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-zim-green text-white flex items-center justify-center text-sm font-medium">3</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">View Shipment Details</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Once you submit your tracking number, you'll see detailed information about your shipment, 
                including its current status, location, and estimated delivery date.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackingInstructions;
