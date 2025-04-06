
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, Clock, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-zim-green" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Find Your Tracking Number</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your tracking number can be found in your email confirmation, receipt, or in your account dashboard.
                It typically looks like this: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ZIM12345UK</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-zim-green/10 flex items-center justify-center flex-shrink-0">
              <Truck className="h-5 w-5 text-zim-green" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Enter Your Tracking Number</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter your tracking number in the search box above and click "Track" to see the current status of your shipment.
                Make sure to enter the full tracking number without any spaces.
              </p>
            </div>
          </div>
        </div>

        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
          <AlertDescription>
            <span className="font-semibold">Note:</span> Tracking information is updated daily. Please allow up to 24 hours for status changes to reflect in the system. For urgent inquiries about your shipment, please contact our customer service team directly.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TrackingInstructions;
