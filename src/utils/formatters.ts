
/**
 * Format currency values
 * 
 * @param amount Amount to format
 * @param currencyCode Currency code (ISO 4217)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode: string = 'GBP'): string => {
  const currencySymbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    ZWL: 'Z$',
  };

  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

/**
 * Formats a date into a readable string
 * 
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formats a timestamp into a readable date and time string
 * 
 * @param timestamp Timestamp to format
 * @returns Formatted timestamp string
 */
export const formatTimestamp = (timestamp: Date | string): string => {
  const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
