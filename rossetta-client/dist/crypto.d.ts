/**
 * Cryptographic utilities for Rossetta Client
 * Uses Web Crypto API for browser-based encryption
 */
/**
 * Generate a cryptographically secure random nonce
 */
export declare function generateNonce(length?: number): string;
/**
 * Generate AES-256 key
 */
export declare function generateAESKey(): Promise<CryptoKey>;
/**
 * Export AES key as raw bytes
 */
export declare function exportAESKey(key: CryptoKey): Promise<ArrayBuffer>;
/**
 * Import AES key from raw bytes
 */
export declare function importAESKey(keyData: ArrayBuffer): Promise<CryptoKey>;
/**
 * Import RSA public key from PEM string
 */
export declare function importPublicKey(pemKey: string): Promise<CryptoKey>;
/**
 * Encrypt data using AES-GCM
 */
export declare function encryptWithAES(data: ArrayBuffer, key: CryptoKey): Promise<{
    ciphertext: ArrayBuffer;
    nonce: ArrayBuffer;
    tag: ArrayBuffer;
}>;
/**
 * Decrypt data using AES-GCM
 */
export declare function decryptWithAES(ciphertext: ArrayBuffer, key: CryptoKey, nonce: ArrayBuffer, tag: ArrayBuffer): Promise<ArrayBuffer>;
/**
 * Encrypt data using RSA-OAEP
 */
export declare function encryptWithRSA(data: ArrayBuffer, publicKey: CryptoKey): Promise<ArrayBuffer>;
/**
 * Create signature (SHA-256 hash) of data
 */
export declare function createSignature(data: string): Promise<string>;
/**
 * Convert ArrayBuffer to Base64 string
 */
export declare function arrayBufferToBase64(buffer: ArrayBuffer): string;
/**
 * Convert Base64 string to ArrayBuffer
 */
export declare function base64ToArrayBuffer(base64: string): ArrayBuffer;
/**
 * Combine multiple ArrayBuffers
 */
export declare function combineArrayBuffers(...buffers: ArrayBuffer[]): ArrayBuffer;
