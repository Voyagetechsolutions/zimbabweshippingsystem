
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
