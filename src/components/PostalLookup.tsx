
import React, { useState, useEffect } from 'react';
import { 
  getRouteForPostalCode, 
  getDateByPostcode, 
  getAreasFromPostalCode, 
  isRestrictedPostalCode,
  isValidUKPostcode,
  canIdentifyPartialPostcode
} from '@/utils/postalCodeUtils';
import { AlertCircle, Truck, Calendar, MapPin } from 'lucide-react';

interface PostalLookupProps {
  postcode: string;
  className?: string;
  showOnlyWhenValid?: boolean;
}

const PostalLookup: React.FC<PostalLookupProps> = ({ 
  postcode, 
  className, 
  showOnlyWhenValid = false 
}) => {
  const [lookupData, setLookupData] = useState<{
    route: string | null;
    date: string | null;
    areas: string[];
    isRestricted: boolean;
    isValid: boolean;
    canIdentify: boolean;
  }>({
    route: null,
    date: null,
    areas: [],
    isRestricted: false,
    isValid: false,
    canIdentify: false
  });

  useEffect(() => {
    if (!postcode) {
      setLookupData({
        route: null,
        date: null,
        areas: [],
        isRestricted: false,
        isValid: false,
        canIdentify: false
      });
      return;
    }

    // Normalize postcode
    const normalizedPostcode = postcode.trim().toUpperCase();
    
    // Check if we can identify this as a partial postcode
    const canIdentify = canIdentifyPartialPostcode(normalizedPostcode);
    
    // Check if we have a valid UK postcode format (basic check)
    const valid = isValidUKPostcode(normalizedPostcode);
    
    // Check if it's a restricted area
    const restricted = isRestrictedPostalCode(normalizedPostcode);
    
    // Get route information
    const route = getRouteForPostalCode(normalizedPostcode);
    
    // Get collection date
    const date = getDateByPostcode(normalizedPostcode);
    
    // Get areas
    const areas = getAreasFromPostalCode(normalizedPostcode);

    setLookupData({
      route,
      date,
      areas,
      isRestricted: restricted,
      isValid: valid,
      canIdentify
    });
  }, [postcode]);

  // Don't render anything if postcode is empty
  if (!postcode || postcode.trim().length === 0) {
    return null;
  }

  // If we're only showing when valid and it's not valid, check if we can at least identify it
  if (showOnlyWhenValid && !lookupData.isValid && !lookupData.canIdentify) {
    return null;
  }

  if (lookupData.isRestricted) {
    return (
      <div className={`mt-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <p className="text-red-600 font-medium flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" /> Restricted Area
        </p>
        <p className="text-sm text-red-500">
          Sorry, we currently don't service this area. Please contact our support team for alternative options.
        </p>
      </div>
    );
  }

  if (!lookupData.route && postcode.trim().length >= 2) {
    return (
      <div className={`mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md ${className}`}>
        <p className="text-yellow-600 font-medium flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" /> Area Not Recognized
        </p>
        <p className="text-sm text-yellow-500">
          We couldn't identify this area. Please check your postcode or contact us for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className={`mt-2 p-3 bg-green-50 border border-green-200 rounded-md ${className}`}>
      {lookupData.route && (
        <div className="mb-1">
          <span className="text-sm font-medium text-green-700 flex items-center">
            <Truck className="h-3 w-3 mr-1" /> Collection Route:
          </span>
          <span className="text-sm text-green-600 ml-5">{lookupData.route}</span>
        </div>
      )}
      {lookupData.date && (
        <div className="mb-1">
          <span className="text-sm font-medium text-green-700 flex items-center">
            <Calendar className="h-3 w-3 mr-1" /> Collection Date:
          </span>
          <span className="text-sm text-green-600 ml-5">{lookupData.date}</span>
        </div>
      )}
      {lookupData.areas.length > 0 && lookupData.areas[0] !== 'Area not specified' && (
        <div>
          <span className="text-sm font-medium text-green-700 flex items-center">
            <MapPin className="h-3 w-3 mr-1" /> Area:
          </span>
          <span className="text-sm text-green-600 ml-5">{lookupData.areas.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

export default PostalLookup;
