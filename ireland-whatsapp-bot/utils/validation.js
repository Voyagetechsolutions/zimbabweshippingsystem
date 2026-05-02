/**
 * Validation Utilities
 * Input validation for booking flow
 */

const PHONE_REGEX = /^[\d\s\+\-\(\)]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate phone number
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\D/g, '');
  return PHONE_REGEX.test(phone) && cleaned.length >= 7;
}

/**
 * Validate email address
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Check if response is "yes"
 */
export function isYes(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return ['yes', 'y', '1', 'yeah', 'yep'].includes(lower);
}

/**
 * Check if response is "no"
 */
export function isNo(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return ['no', 'n', '2', 'nope', 'nah'].includes(lower);
}

/**
 * Validate name (at least 2 characters)
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2;
}

/**
 * Validate address (at least 4 characters)
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return address.trim().length >= 4;
}

/**
 * Validate city name
 */
export function isValidCity(city) {
  if (!city || typeof city !== 'string') return false;
  return city.trim().length >= 2;
}

/**
 * Validate quantity (positive integer)
 */
export function isValidQuantity(qty) {
  const num = parseInt(qty, 10);
  return !isNaN(num) && num > 0;
}

/**
 * Validate description (at least 3 characters)
 */
export function isValidDescription(desc) {
  if (!desc || typeof desc !== 'string') return false;
  return desc.trim().length >= 3;
}
