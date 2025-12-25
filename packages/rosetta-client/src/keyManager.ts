/**
 * Key management for client-server encryption
 */

import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
} from './crypto';

export class KeyManager {
  private keyPair: CryptoKeyPair | null = null;
  private serverPublicKey: CryptoKey | null = null;
  private sharedKey: CryptoKey | null = null;
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  /**
   * Initialize key exchange with server
   */
  async initialize(): Promise<void> {
    // Generate client key pair
    this.keyPair = await generateKeyPair();
    
    // Export client public key
    const clientPublicKey = await exportPublicKey(this.keyPair.publicKey);
    
    // Send public key to server and receive server's public key
    const response = await globalThis.fetch(`${this.serverUrl}/__rosetta__/key-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientPublicKey,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Key exchange failed: ${response.statusText}`);
    }
    
    const { serverPublicKey } = await response.json();
    
    // Import server's public key
    this.serverPublicKey = await importPublicKey(serverPublicKey);
    
    // Derive shared secret
    this.sharedKey = await deriveSharedKey(
      this.keyPair.privateKey,
      this.serverPublicKey
    );
  }

  /**
   * Get the shared encryption key
   */
  getSharedKey(): CryptoKey {
    if (!this.sharedKey) {
      throw new Error('Key exchange not initialized. Call initialize() first.');
    }
    return this.sharedKey;
  }

  /**
   * Check if key exchange is initialized
   */
  isInitialized(): boolean {
    return this.sharedKey !== null;
  }
}
