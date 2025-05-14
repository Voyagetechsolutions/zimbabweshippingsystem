
import { format, formatDistance, formatRelative, isValid } from 'date-fns';

/**
 * Format a date to a standard display format
 * 
 * @param date The date to format (string or Date)
 * @param formatString Optional format string, defaults to 'MMM d, yyyy'
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | number, formatString = 'MMM d, yyyy'): string {
  if (!date) return 'N/A';
  try {
    const dateObj = new Date(date);
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date with time to a standard display format
 * 
 * @param date The date to format (string or Date)
 * @returns Formatted date string with time
 */
export function formatDateTime(date: string | Date | number): string {
  return formatDate(date, 'MMM d, yyyy HH:mm');
}

/**
 * Format a date relative to current time (e.g., "2 hours ago")
 * 
 * @param date The date to format (string or Date)
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | number): string {
  if (!date) return 'N/A';
  try {
    const dateObj = new Date(date);
    if (!isValid(dateObj)) return 'Invalid date';
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a currency value
 * 
 * @param value The numeric value to format
 * @param currency The currency code, defaults to USD
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(value);
}

/**
 * Format a file size in bytes to a human-readable string
 * 
 * @param bytes The size in bytes
 * @param decimals The number of decimal places, defaults to 2
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a phone number to a standard display format
 * 
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Basic US phone number formatting - modify as needed
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return phoneNumber; // Return original if not 10 digits
  }
  
  return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
}

/**
 * Truncate text with ellipsis if it exceeds the specified length
 * 
 * @param text The text to truncate
 * @param maxLength The maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get a status badge class based on status text
 * 
 * @param status The status text
 * @returns CSS class string for styling badges
 */
export function getStatusBadgeClass(status: string): string {
  const statusLower = (status || '').toLowerCase();
  
  switch (true) {
    case statusLower.includes('processing'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('out for delivery'):
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case statusLower.includes('delivered'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('delayed'):
      return 'bg-red-100 text-red-800 border-red-300';
    case statusLower.includes('returned'):
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case statusLower.includes('open'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('closed'):
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case statusLower.includes('pending'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('high'):
      return 'bg-red-100 text-red-800 border-red-300';
    case statusLower.includes('medium'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('low'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}
