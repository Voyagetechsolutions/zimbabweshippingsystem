
/**
 * Comprehensive form validation utilities
 * Provides validation for common form inputs and sanitization
 */

// Email validation with strict regex
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Password strength validation
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  message: string;
} => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  
  const requirements = [
    { met: hasUppercase, message: 'uppercase letter' },
    { met: hasLowercase, message: 'lowercase letter' },
    { met: hasNumbers, message: 'number' },
    { met: hasSpecialChar, message: 'special character' }
  ];
  
  const missingRequirements = requirements
    .filter(req => !req.met)
    .map(req => req.message);
  
  if (missingRequirements.length > 0) {
    return {
      isValid: false,
      message: `Password must include at least one ${missingRequirements.join(', ')}`
    };
  }
  
  return { isValid: true, message: 'Password meets strength requirements' };
};

// Phone number validation
export const isValidPhoneNumber = (phone: string): boolean => {
  // Remove spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{10,15}$/.test(cleanPhone);
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Validate address inputs
export const validateAddress = (address: {
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!address.streetAddress || address.streetAddress.trim().length < 3) {
    errors.streetAddress = 'Street address is required and must be at least 3 characters';
  }
  
  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'City is required and must be at least 2 characters';
  }
  
  if (address.postalCode && !/^[a-zA-Z0-9\s-]{3,10}$/.test(address.postalCode)) {
    errors.postalCode = 'Please enter a valid postal code';
  }
  
  if (!address.country || address.country.trim().length < 2) {
    errors.country = 'Country is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validate shipping details
export const validateShippingDetails = (details: {
  weight?: number;
  dimensions?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!details.weight || isNaN(details.weight) || details.weight <= 0) {
    errors.weight = 'Please enter a valid weight';
  }
  
  if (details.dimensions && !/^\d+x\d+x\d+$/.test(details.dimensions)) {
    errors.dimensions = 'Dimensions should be in format LxWxH (e.g., 10x5x3)';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
