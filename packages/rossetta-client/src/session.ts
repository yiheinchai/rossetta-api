/**
 * Session manager for handling key exchange and encryption sessions
 */

import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
} from './crypto';

interface Session {
  sharedKey: CryptoKey;
  expiresAt: number;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private keyPairs: Map<string, CryptoKeyPair> = new Map();
  private readonly SESSION_DURATION = 3600000; // 1 hour in milliseconds

  /**
   * Get or create session for a base URL
   */
  async getSession(baseUrl: string): Promise<CryptoKey> {
    const existing = this.sessions.get(baseUrl);
    
    // Return existing session if still valid
    if (existing && existing.expiresAt > Date.now()) {
      return existing.sharedKey;
    }

    // Create new session
    return await this.createSession(baseUrl);
  }

  /**
   * Create a new session with key exchange
   */
  private async createSession(baseUrl: string): Promise<CryptoKey> {
    // Generate client key pair
    const keyPair = await generateKeyPair();
    this.keyPairs.set(baseUrl, keyPair);

    // Export client public key
    const clientPublicKey = await exportPublicKey(keyPair.publicKey);

    // Perform key exchange with server
    const handshakeUrl = `${baseUrl}/__rossetta_handshake__`;
    const response = await fetch(handshakeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_public_key: clientPublicKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Key exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const serverPublicKey = await importPublicKey(data.server_public_key);

    // Derive shared secret
    const sharedKey = await deriveSharedSecret(keyPair.privateKey, serverPublicKey);

    // Store session
    this.sessions.set(baseUrl, {
      sharedKey,
      expiresAt: Date.now() + this.SESSION_DURATION,
    });

    return sharedKey;
  }

  /**
   * Clear session for a base URL
   */
  clearSession(baseUrl: string): void {
    this.sessions.delete(baseUrl);
    this.keyPairs.delete(baseUrl);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.keyPairs.clear();
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
