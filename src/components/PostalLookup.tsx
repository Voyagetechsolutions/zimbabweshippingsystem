
import React, { useState } from 'react';
import { getRouteForPostalCode, getDateByPostcode, getAreasFromPostalCode, isRestrictedPostalCode } from '@/utils/postalCodeUtils';

interface PostalLookupProps {
  postcode: string;
  className?: string;
}

const PostalLookup: React.FC<PostalLookupProps> = ({ postcode, className }) => {
  const [lookupData, setLookupData] = useState<{
    route: string | null;
    date: string | null;
    areas: string[];
    isRestricted: boolean;
  }>({
    route: null,
    date: null,
    areas: [],
    isRestricted: false,
  });

  React.useEffect(() => {
    if (!postcode) {
      setLookupData({
        route: null,
        date: null,
        areas: [],
        isRestricted: false,
      });
      return;
    }

    // Normalize postcode
    const normalizedPostcode = postcode.trim().toUpperCase();
    
    // Check if we have a valid UK postcode format (basic check)
    if (normalizedPostcode.length < 5) {
      return;
    }

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
    });
  }, [postcode]);

  if (!postcode || postcode.trim().length < 5) {
    return null;
  }

  if (lookupData.isRestricted) {
    return (
      <div className={`mt-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <p className="text-red-600 font-medium">Restricted Area</p>
        <p className="text-sm text-red-500">
          Sorry, we currently don't service this area. Please contact us for alternative options.
        </p>
      </div>
    );
  }

  if (!lookupData.route) {
    return (
      <div className={`mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md ${className}`}>
        <p className="text-yellow-600 font-medium">Area Not Recognized</p>
        <p className="text-sm text-yellow-500">
          We couldn't identify this area. Please check your postcode or contact us for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className={`mt-2 p-3 bg-green-50 border border-green-200 rounded-md ${className}`}>
      <div className="mb-1">
        <span className="text-sm font-medium text-green-700">Collection Route:</span>
        <span className="text-sm text-green-600 ml-2">{lookupData.route}</span>
      </div>
      {lookupData.date && (
        <div className="mb-1">
          <span className="text-sm font-medium text-green-700">Collection Date:</span>
          <span className="text-sm text-green-600 ml-2">{lookupData.date}</span>
        </div>
      )}
      {lookupData.areas.length > 0 && (
        <div>
          <span className="text-sm font-medium text-green-700">Area:</span>
          <span className="text-sm text-green-600 ml-2">{lookupData.areas.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

export default PostalLookup;
