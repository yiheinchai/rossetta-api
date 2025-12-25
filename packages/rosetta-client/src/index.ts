/**
 * Rosetta Client - Drop-in replacement for fetch with e2e encryption
 */

import { KeyManager } from './keyManager';
import {
  generateNonce,
  encrypt,
  decrypt,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  EncryptedPayload,
} from './crypto';

// Global key manager instance per server
const keyManagers = new Map<string, KeyManager>();

/**
 * Get or create key manager for a server
 */
async function getKeyManager(url: string): Promise<KeyManager> {
  const serverUrl = new URL(url).origin;
  
  let manager = keyManagers.get(serverUrl);
  if (!manager) {
    manager = new KeyManager(serverUrl);
    keyManagers.set(serverUrl, manager);
  }
  
  if (!manager.isInitialized()) {
    await manager.initialize();
  }
  
  return manager;
}

/**
 * Encrypt request payload
 */
async function encryptRequest(
  url: string,
  options: RequestInit = {}
): Promise<{ encryptedPayload: string; iv: string }> {
  const manager = await getKeyManager(url);
  const sharedKey = manager.getSharedKey();
  
  // Prepare payload to encrypt
  const payload = {
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };
  
  // Generate IV for AES-GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  
  // Encrypt the payload
  const payloadString = JSON.stringify(payload);
  const ciphertext = await encrypt(payloadString, sharedKey, iv);
  
  return {
    encryptedPayload: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt response payload
 */
async function decryptResponse(
  url: string,
  encryptedData: string,
  iv: string
): Promise<any> {
  const manager = await getKeyManager(url);
  const sharedKey = manager.getSharedKey();
  
  const ciphertext = base64ToArrayBuffer(encryptedData);
  const ivArray = new Uint8Array(base64ToArrayBuffer(iv));
  
  const decrypted = await decrypt(ciphertext, sharedKey, ivArray);
  return JSON.parse(decrypted);
}

/**
 * Rosetta fetch - Drop-in replacement for fetch with e2e encryption
 */
export async function fetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // Encrypt the request
  const { encryptedPayload, iv } = await encryptRequest(url, init);
  
  // Send encrypted request to server
  const response = await globalThis.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rosetta-Encrypted': 'true',
    },
    body: JSON.stringify({
      encryptedPayload,
      iv,
    }),
  });
  
  // Handle encrypted response
  if (response.headers.get('X-Rosetta-Encrypted') === 'true') {
    const encryptedResponse = await response.json();
    const decryptedData = await decryptResponse(
      url,
      encryptedResponse.encryptedPayload,
      encryptedResponse.iv
    );
    
    // Create a new Response object with decrypted data
    return new Response(JSON.stringify(decryptedData.body), {
      status: decryptedData.status,
      statusText: decryptedData.statusText,
      headers: decryptedData.headers,
    });
  }
  
  // If not encrypted, return as-is (shouldn't happen in production)
  return response;
}

/**
 * Reset key manager (useful for testing)
 */
export function resetKeyManagers(): void {
  keyManagers.clear();
}
