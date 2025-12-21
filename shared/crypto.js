/**
 * Shared cryptographic utilities for request/response obfuscation
 * This module provides encryption, decryption, and endpoint obfuscation
 */

import crypto from 'crypto';

// Shared secret key - In production, this should be environment-specific
// WARNING: This is a demonstration. NEVER use default keys in production!
// Set ROSSETTA_SECRET_KEY environment variable before deploying.
const SECRET_KEY = process.env.ROSSETTA_SECRET_KEY || 'rossetta-default-secret-key-change-me-32';

if (!process.env.ROSSETTA_SECRET_KEY) {
  console.warn('\n⚠️  WARNING: Using default secret key! Set ROSSETTA_SECRET_KEY environment variable in production.\n');
}

const ALGORITHM = 'aes-256-cbc';

/**
 * Generate a deterministic obfuscated endpoint path
 * @param {string} endpoint - Original endpoint name
 * @returns {string} - Obfuscated endpoint path
 */
export function obfuscateEndpoint(endpoint) {
  const hash = crypto.createHash('sha256').update(endpoint + SECRET_KEY).digest('hex');
  return `/api/${hash.substring(0, 16)}`;
}

/**
 * Encrypt data for transmission
 * @param {any} data - Data to encrypt
 * @returns {string} - Encrypted data as base64 string
 */
export function encrypt(data) {
  const jsonString = JSON.stringify(data);
  
  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(16);
  
  // Create cipher with key (hashed to ensure 32 bytes)
  const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(jsonString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Return IV + encrypted data
  return iv.toString('base64') + ':' + encrypted;
}

/**
 * Decrypt received data
 * @param {string} encryptedData - Encrypted data string
 * @returns {any} - Decrypted and parsed data
 */
export function decrypt(encryptedData) {
  const [ivBase64, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivBase64, 'base64');
  const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

/**
 * Create a request signature to prevent tampering
 * @param {any} data - Request data
 * @param {number} timestamp - Request timestamp
 * @returns {string} - Request signature
 */
export function createSignature(data, timestamp) {
  const payload = JSON.stringify(data) + timestamp;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

/**
 * Verify request signature
 * @param {any} data - Request data
 * @param {number} timestamp - Request timestamp
 * @param {string} signature - Provided signature
 * @returns {boolean} - Whether signature is valid
 */
export function verifySignature(data, timestamp, signature) {
  const expectedSignature = createSignature(data, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Check if timestamp is within acceptable range (prevent replay attacks)
 * @param {number} timestamp - Request timestamp
 * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
 * @returns {boolean} - Whether timestamp is valid
 */
export function isTimestampValid(timestamp, maxAge = 5 * 60 * 1000) {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAge;
}

// Export endpoint names for consistency
export const ENDPOINTS = {
  LIST_TODOS: 'list-todos',
  CREATE_TODO: 'create-todo',
  UPDATE_TODO: 'update-todo',
  DELETE_TODO: 'delete-todo',
  TOGGLE_TODO: 'toggle-todo'
};
