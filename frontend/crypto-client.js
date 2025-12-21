/**
 * Browser-compatible crypto utilities for obfuscated API communication
 * This is the client-side implementation that mirrors the server-side crypto
 * 
 * ⚠️ WARNING: This is a demonstration with a hardcoded key.
 * In production, implement proper key exchange or derive keys server-side.
 */

// Shared secret key - must match server
// WARNING: Hardcoded keys in client-side JavaScript are visible to everyone!
// This is for demonstration only. In production, use secure key management.
const SECRET_KEY = 'rossetta-default-secret-key-change-me-32';
const ALGORITHM = 'AES-CBC';

/**
 * Convert string to ArrayBuffer
 */
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to string
 */
function ab2str(buf) {
  const decoder = new TextDecoder();
  return decoder.decode(buf);
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive crypto key from secret (matches server implementation)
 */
async function deriveKey(secret) {
  // Hash the secret to get 32 bytes (256 bits) - same as server
  const hashBuffer = await crypto.subtle.digest('SHA-256', str2ab(secret));
  
  // Import as AES key
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a deterministic obfuscated endpoint path
 */
async function obfuscateEndpoint(endpoint) {
  const data = str2ab(endpoint + SECRET_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `/api/${hashHex.substring(0, 16)}`;
}

/**
 * Encrypt data for transmission
 */
async function encrypt(data) {
  const jsonString = JSON.stringify(data);
  const key = await deriveKey(SECRET_KEY);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(16));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    str2ab(jsonString)
  );
  
  // Return IV + encrypted data as base64
  const ivBase64 = arrayBufferToBase64(iv);
  const encryptedBase64 = arrayBufferToBase64(encrypted);
  
  return ivBase64 + ':' + encryptedBase64;
}

/**
 * Decrypt received data
 */
async function decrypt(encryptedData) {
  const [ivBase64, encryptedBase64] = encryptedData.split(':');
  
  const iv = base64ToArrayBuffer(ivBase64);
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const key = await deriveKey(SECRET_KEY);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );
  
  const jsonString = ab2str(decrypted);
  return JSON.parse(jsonString);
}

/**
 * Create a request signature
 */
async function createSignature(data, timestamp) {
  const payload = JSON.stringify(data) + timestamp;
  const key = await crypto.subtle.importKey(
    'raw',
    str2ab(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    str2ab(payload)
  );
  
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Export endpoint names for consistency
const ENDPOINTS = {
  LIST_TODOS: 'list-todos',
  CREATE_TODO: 'create-todo',
  UPDATE_TODO: 'update-todo',
  DELETE_TODO: 'delete-todo',
  TOGGLE_TODO: 'toggle-todo'
};
