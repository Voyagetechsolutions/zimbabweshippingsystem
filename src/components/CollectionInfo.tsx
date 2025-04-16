
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDateByRoute } from '@/data/collectionSchedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface CollectionInfoProps {
  route: string;
  areas: string[];
  onDateChange: (date: string) => void;
}

const CollectionInfo: React.FC<CollectionInfoProps> = ({ route, areas, onDateChange }) => {
  const [collectionDate, setCollectionDate] = useState<string>('');
  
  useEffect(() => {
    if (route) {
      const date = getDateByRoute(route);
      setCollectionDate(date);
      onDateChange(date);
    }
  }, [route, onDateChange]);
  
  return (
    <Card className="bg-slate-50 border border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Collection Information</CardTitle>
      </CardHeader>
      <CardContent>
        {route && (
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="font-medium">Route:</span>
              <span className="text-green-700">{route}</span>
            </div>
            
            {collectionDate && (
              <div className="flex flex-col">
                <span className="font-medium">Collection Date:</span>
                <span className="text-green-700">{collectionDate}</span>
              </div>
            )}
            
            {areas.length > 0 && (
              <div className="flex flex-col">
                <span className="font-medium">Areas covered:</span>
                <div className="text-sm text-slate-600 mt-1">
                  {areas.join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
        
        {!route && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>No route found</AlertTitle>
            <AlertDescription>
              We couldn't find a collection route for the provided postal code. Please contact support for assistance.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionInfo;
