
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a unique ID (for tracking numbers, shipment IDs, etc.)
export function generateUniqueId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

// Function to capitalize the first letter of each word
export function capitalize(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}
