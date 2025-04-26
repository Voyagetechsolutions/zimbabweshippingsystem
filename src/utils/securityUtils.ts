
/**
 * Security utility functions for the application
 * These help protect against common security vulnerabilities
 */

export const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return 'unknown';
  }
};

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  // Basic XSS prevention by removing HTML tags and scripts
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const isStrongPassword = (password: string): boolean => {
  // Minimum 8 characters with at least one uppercase, lowercase, number and special character
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

export const handleAuthError = (error: any, toast: any) => {
  const message = error?.message || 'An unexpected error occurred';
  console.error('Auth error:', error);
  
  if (message.includes('too many failed attempts')) {
    toast({
      title: 'Account Protection',
      description: 'Too many failed attempts. Please try again later.',
      variant: 'destructive',
    });
  } else if (message.includes('Email not confirmed')) {
    toast({
      title: 'Email Not Verified',
      description: 'Please check your email and click the verification link.',
      variant: 'destructive',
    });
  } else if (message.includes('Invalid login credentials')) {
    toast({
      title: 'Login Failed',
      description: 'Invalid email or password. Please try again.',
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Authentication Error',
      description: message,
      variant: 'destructive',
    });
  }
};

export const rateLimitCheck = (() => {
  const attempts = new Map<string, { count: number, firstAttempt: number }>();
  
  return (identifier: string, maxAttempts = 5, timeWindow = 15 * 60 * 1000): boolean => {
    const now = Date.now();
    const record = attempts.get(identifier);
    
    if (!record) {
      attempts.set(identifier, { count: 1, firstAttempt: now });
      return true; // First attempt is allowed
    }
    
    // Reset if outside the time window
    if (now - record.firstAttempt > timeWindow) {
      attempts.set(identifier, { count: 1, firstAttempt: now });
      return true;
    }
    
    // Increment count and check
    record.count += 1;
    attempts.set(identifier, record);
    
    return record.count <= maxAttempts;
  };
})();
