/**
 * Cryptographic utilities for rossetta-client
 * Uses Web Crypto API for encryption/decryption
 */

/**
 * Generate ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export public key to base64 string
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Derive shared secret from local private key and remote public key
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  key: CryptoKey,
  data: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    ciphertextBuffer
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array);
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
