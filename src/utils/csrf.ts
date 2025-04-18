
import { generateUniqueId } from './utils';

export const generateCSRFToken = (): string => {
  const token = generateUniqueId();
  sessionStorage.setItem('csrf_token', token);
  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrf_token');
  if (!storedToken || storedToken !== token) {
    return false;
  }
  // Remove the used token
  sessionStorage.removeItem('csrf_token');
  return true;
};
