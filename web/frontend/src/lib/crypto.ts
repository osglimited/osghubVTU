// Import the Web Crypto API
const crypto = typeof window !== 'undefined' ? window.crypto : require('crypto');

/**
 * Generates a secure hash of the input string using SHA-256
 * @param input The string to hash
 * @returns A promise that resolves to the hashed string
 */
export const generateHash = async (input: string): Promise<string> => {
  // Use Web Crypto API in the browser or Node.js crypto module in server-side
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('hex');
  }
};

/**
 * Generates a random string of specified length
 * @param length Length of the random string to generate
 * @returns A random string
 */
export const generateRandomString = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, length);
};

/**
 * Encrypts data using AES-GCM
 * @param data The data to encrypt
 * @param key The encryption key (should be 32 bytes for AES-256)
 * @returns The encrypted data as a base64 string
 */
export const encryptData = async (data: string, key: string): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Encryption is only available in the browser');
  }
  
  // Import the key
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Generate a random IV (Initialization Vector)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    keyMaterial,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data
  const result = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode.apply(null, Array.from(result)));
};

/**
 * Decrypts data that was encrypted with encryptData
 * @param encryptedData The encrypted data as a base64 string
 * @param key The encryption key used to encrypt the data
 * @returns The decrypted data as a string
 */
export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Decryption is only available in the browser');
  }
  
  // Import the key
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Convert from base64 to Uint8Array
  const binaryString = atob(encryptedData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Extract IV and encrypted data
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  
  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    keyMaterial,
    data
  );
  
  return new TextDecoder().decode(decrypted);
};
