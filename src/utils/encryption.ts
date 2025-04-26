
/**
 * Utility functions for encrypting and decrypting sensitive data
 * Using the Web Crypto API for strong encryption
 */

// Generate a key from a password - this is a simplified version
// In production, use a proper key derivation function
const getKeyFromPassword = async (password: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Hash the password to get material for the key
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Import the key
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts a string value
 * @param value The string to encrypt
 * @param password The password to use for encryption
 * @returns Base64-encoded encrypted string with IV prepended
 */
export const encryptValue = async (value: string, password: string): Promise<string> => {
  try {
    const key = await getKeyFromPassword(password);
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    
    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine the IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Return as base64 string
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
};

/**
 * Decrypts an encrypted string value
 * @param encryptedValue Base64-encoded encrypted string with IV prepended
 * @param password The password used for encryption
 * @returns The decrypted string
 */
export const decryptValue = async (encryptedValue: string, password: string): Promise<string> => {
  try {
    const key = await getKeyFromPassword(password);
    
    // Convert base64 to array
    const encryptedData = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
    
    // Extract the IV (first 12 bytes)
    const iv = encryptedData.slice(0, 12);
    
    // Get the encrypted data (everything after IV)
    const data = encryptedData.slice(12);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Convert the decrypted data to a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt value');
  }
};

/**
 * Masks sensitive information for display
 * @param value The value to mask
 * @param revealDigits Number of characters to reveal at the end
 * @returns Masked string
 */
export const maskSensitiveData = (value: string, revealDigits = 4): string => {
  if (!value || value.length <= revealDigits) {
    return value;
  }
  
  const maskedLength = value.length - revealDigits;
  const maskedPart = '*'.repeat(Math.min(maskedLength, 8));
  const revealedPart = value.substring(maskedLength);
  
  return maskedPart + revealedPart;
};
