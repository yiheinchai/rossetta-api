/**
 * Browser-compatible crypto utilities for obfuscated API communication
 * This is the client-side implementation that uses session-based keys
 * 
 * Keys are obtained from the server via secure session initialization
 */

// Session-based encryption key (obtained from server)
let SESSION_KEY = null;
let SESSION_ENDPOINT_SALT = null;
const ALGORITHM = 'AES-CBC';

/**
 * Initialize session and obtain encryption key from server
 */
async function initializeSession() {
  try {
    const response = await fetch('/api/init-session', {
      method: 'POST',
      credentials: 'include' // Include cookies for session
    });
    
    if (!response.ok) {
      throw new Error('Failed to initialize session');
    }
    
    const data = await response.json();
    SESSION_KEY = data.sessionKey;
    SESSION_ENDPOINT_SALT = data.endpointSalt;
    
    console.log('✅ Session initialized securely');
    return true;
  } catch (error) {
    console.error('Failed to initialize session:', error);
    return false;
  }
}

/**
 * Get the current session key (initialize if needed)
 */
async function getSessionKey() {
  if (!SESSION_KEY) {
    await initializeSession();
  }
  return SESSION_KEY;
}

/**
 * Get the endpoint salt (initialize if needed)
 */
async function getEndpointSalt() {
  if (!SESSION_ENDPOINT_SALT) {
    await initializeSession();
  }
  return SESSION_ENDPOINT_SALT;
}

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
  const salt = await getEndpointSalt();
  const data = str2ab(endpoint + salt);
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
  const sessionKey = await getSessionKey();
  const key = await deriveKey(sessionKey);
  
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
  const sessionKey = await getSessionKey();
  const key = await deriveKey(sessionKey);
  
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
  const sessionKey = await getSessionKey();
  const key = await crypto.subtle.importKey(
    'raw',
    str2ab(sessionKey),
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
