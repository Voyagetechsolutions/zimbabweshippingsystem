
/**
 * UK Postal Code validation utilities
 */

// Check if a postal code matches the required format (starts with 1-2 letters followed by numbers)
export const isValidUKPostcode = (postcode: string): boolean => {
  // Basic UK postcode validation: 
  // Should start with 1-2 letters followed by at least one number
  const regex = /^[A-Z]{1,2}[0-9]/i;
  return regex.test(postcode.trim());
};

// Format a postcode to standard UK format
export const formatUKPostcode = (postcode: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  const cleanPostcode = postcode.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return cleanPostcode;
};

// Get the outward part of the postcode (the first part)
export const getOutwardPostcode = (postcode: string): string => {
  const cleanPostcode = formatUKPostcode(postcode);
  // The outward code is everything before the last 3 characters
  return cleanPostcode.slice(0, -3);
};

// Get the inward part of the postcode (the last part)
export const getInwardPostcode = (postcode: string): string => {
  const cleanPostcode = formatUKPostcode(postcode);
  // The inward code is the last 3 characters
  return cleanPostcode.slice(-3);
};
