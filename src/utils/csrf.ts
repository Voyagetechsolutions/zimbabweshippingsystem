
import { generateUniqueId } from './utils';

export const generateCSRFToken = (): string => {
  // Generate a more secure token
  const token = generateUniqueId() + '-' + Date.now();
  
  // Store in sessionStorage with expiry (15 minutes)
  const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes
  sessionStorage.setItem('csrf_token', token);
  sessionStorage.setItem('csrf_token_expiry', expiry.toString());
  
  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrf_token');
  const expiryStr = sessionStorage.getItem('csrf_token_expiry');
  
  // No token or expired token
  if (!storedToken || !expiryStr) {
    return false;
  }
  
  // Check if token is expired
  const expiry = parseInt(expiryStr, 10);
  if (Date.now() > expiry) {
    // Clean up expired token
    sessionStorage.removeItem('csrf_token');
    sessionStorage.removeItem('csrf_token_expiry');
    return false;
  }
  
  // Validate token
  if (storedToken !== token) {
    return false;
  }
  
  // Valid token - don't remove it for sign-in flow to support retries
  return true;
};
