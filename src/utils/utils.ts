
/**
 * Generates a unique identifier, optionally with a prefix
 * @param prefix Optional prefix for the unique ID
 * @returns A unique identifier string
 */
export const generateUniqueId = (prefix?: string): string => {
  // Generate a properly formatted UUID v4
  const uuid = crypto.randomUUID();
  
  return prefix ? `${prefix}${uuid}` : uuid;
};

/**
 * Safe function to get a fallback value if the provided value is null or undefined
 * @param value The value to check
 * @param fallback The fallback value to use if value is null or undefined
 * @returns Either the original value or the fallback
 */
export const getFallbackValue = <T>(value: T | null | undefined, fallback: T): T => {
  return value !== null && value !== undefined ? value : fallback;
};
