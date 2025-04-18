import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * This function has been updated to generate proper UUIDs for database compatibility
 */
export function generateUniqueId(prefix?: string): string {
  // Generate a proper UUID
  const uuid = uuidv4();
  
  // If a prefix is provided, return a string version
  // This will be used for display purposes only, not as DB primary keys
  if (prefix) {
    return `${prefix}${uuid}`;
  }
  
  // Return the raw UUID for database usage
  return uuid;
}
