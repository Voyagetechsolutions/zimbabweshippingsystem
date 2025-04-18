
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * This function has been updated to generate proper UUIDs for database compatibility
 */
export const generateUniqueId = (prefix?: string): string => {
  // Generate a properly formatted UUID v4
  const uuid = crypto.randomUUID();
  
  return prefix ? `${prefix}${uuid}` : uuid;
};
