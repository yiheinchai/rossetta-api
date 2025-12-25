/**
 * Rossetta Client - Drop-in fetch replacement with E2E encryption
 */

import {
  generateNonce,
  generateAESKey,
  exportAESKey,
  importAESKey,
  importPublicKey,
  encryptWithAES,
  decryptWithAES,
  encryptWithRSA,
  createSignature,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  combineArrayBuffers,
} from './crypto';

export interface RossettaConfig {
  /** URL to fetch public key from (default: /.well-known/rossetta-public-key) */
  publicKeyUrl?: string;
  /** Automatically refresh public key periodically */
  autoRefreshKey?: boolean;
  /** Key refresh interval in milliseconds (default: 1 hour) */
  keyRefreshInterval?: number;
}

export interface EncryptedPayload {
  encrypted_data: string;
  encrypted_key: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

/**
 * Rossetta Fetch Client
 */
export class RossettaFetch {
  private baseUrl: string;
  private publicKey: CryptoKey | null = null;
  private config: Required<RossettaConfig>;
  private keyRefreshTimer?: number;

  constructor(baseUrl: string, config: RossettaConfig = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.config = {
      publicKeyUrl: config.publicKeyUrl || '/.well-known/rossetta-public-key',
      autoRefreshKey: config.autoRefreshKey ?? false,
      keyRefreshInterval: config.keyRefreshInterval || 3600000, // 1 hour
    };
  }

  /**
   * Initialize the client by fetching the server's public key
   */
  async initialize(): Promise<void> {
    await this.fetchPublicKey();
    
    if (this.config.autoRefreshKey) {
      this.startKeyRefresh();
    }
  }

  /**
   * Fetch the server's public key
   */
  private async fetchPublicKey(): Promise<void> {
    const response = await fetch(`${this.baseUrl}${this.config.publicKeyUrl}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch public key: ${response.statusText}`);
    }
    
    const data = await response.json();
    this.publicKey = await importPublicKey(data.public_key);
  }

  /**
   * Start automatic key refresh
   */
  private startKeyRefresh(): void {
    this.keyRefreshTimer = window.setInterval(() => {
      this.fetchPublicKey().catch(console.error);
    }, this.config.keyRefreshInterval);
  }

  /**
   * Stop automatic key refresh
   */
  stopKeyRefresh(): void {
    if (this.keyRefreshTimer) {
      clearInterval(this.keyRefreshTimer);
      this.keyRefreshTimer = undefined;
    }
  }

  /**
   * Encrypt request data
   */
  private async encryptRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<EncryptedPayload> {
    if (!this.publicKey) {
      throw new Error('Public key not loaded. Call initialize() first.');
    }

    // Generate AES key for this request
    const aesKey = await generateAESKey();
    const aesKeyRaw = await exportAESKey(aesKey);

    // Prepare request data
    let bodyData: any = null;
    
    // Handle different body types
    if (options.body) {
      if (typeof options.body === 'string') {
        try {
          // Try to parse as JSON
          bodyData = JSON.parse(options.body);
        } catch {
          // If not JSON, keep as string
          bodyData = options.body;
        }
      } else {
        // For other types (FormData, Blob, etc.), convert to string
        // Note: This is a simplification. In production, you might want to handle these differently
        bodyData = String(options.body);
      }
    }
    
    const requestData = {
      method: options.method || 'GET',
      url,
      headers: options.headers || {},
      body: bodyData,
    };

    // Serialize to JSON
    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(requestData));

    // Encrypt data with AES
    const { ciphertext, nonce: aesNonce, tag } = await encryptWithAES(jsonData.buffer, aesKey);

    // Combine nonce + tag + ciphertext
    const combined = combineArrayBuffers(aesNonce, tag, ciphertext);

    // Encrypt AES key with RSA
    const encryptedKey = await encryptWithRSA(aesKeyRaw, this.publicKey);

    // Generate nonce and timestamp
    const nonce = generateNonce();
    const timestamp = Math.floor(Date.now() / 1000);

    // Create signature
    const encryptedDataB64 = arrayBufferToBase64(combined);
    const signature = await createSignature(`${encryptedDataB64}${nonce}${timestamp}`);

    // Store AES key for response decryption
    this.storeAESKey(nonce, aesKey);

    return {
      encrypted_data: encryptedDataB64,
      encrypted_key: arrayBufferToBase64(encryptedKey),
      nonce,
      timestamp,
      signature,
    };
  }

  /**
   * Decrypt response data
   */
  private async decryptResponse(
    encryptedResponse: any,
    aesKey: CryptoKey
  ): Promise<any> {
    const combined = base64ToArrayBuffer(encryptedResponse.encrypted_data);
    const combinedArray = new Uint8Array(combined);

    // Extract nonce (12 bytes), tag (16 bytes), and ciphertext
    const nonce = combinedArray.slice(0, 12).buffer;
    const tag = combinedArray.slice(12, 28).buffer;
    const ciphertext = combinedArray.slice(28).buffer;

    // Decrypt with AES
    const decrypted = await decryptWithAES(ciphertext, aesKey, nonce, tag);

    // Parse JSON
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  }

  /**
   * Store AES key for response decryption
   */
  private aesKeyStore = new Map<string, CryptoKey>();

  private storeAESKey(nonce: string, key: CryptoKey): void {
    this.aesKeyStore.set(nonce, key);
    
    // Clean up old keys after 10 minutes
    setTimeout(() => {
      this.aesKeyStore.delete(nonce);
    }, 600000);
  }

  private getAESKey(nonce: string): CryptoKey | undefined {
    return this.aesKeyStore.get(nonce);
  }

  /**
   * Fetch with encryption - drop-in replacement for native fetch
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Ensure URL is absolute
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    // Extract relative path for encryption
    const urlObj = new URL(fullUrl);
    const relativePath = urlObj.pathname + urlObj.search;

    // Encrypt request
    const encryptedPayload = await this.encryptRequest(relativePath, options);

    // Send encrypted request
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.rossetta.encrypted+json',
      },
      body: JSON.stringify(encryptedPayload),
    });

    // Get the AES key we used for this request
    const aesKey = this.getAESKey(encryptedPayload.nonce);
    if (!aesKey) {
      throw new Error('AES key not found for request');
    }

    // Read response
    const responseData = await response.json();

    // Decrypt response
    const decryptedData = await this.decryptResponse(responseData, aesKey);

    // Create a Response object with decrypted data
    return new Response(JSON.stringify(decryptedData), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}

/**
 * Create a Rossetta fetch function
 * 
 * @param baseUrl - Base URL of the API
 * @param config - Optional configuration
 * @returns A fetch function with built-in encryption
 */
export async function createRossettaFetch(
  baseUrl: string,
  config?: RossettaConfig
): Promise<typeof fetch> {
  const client = new RossettaFetch(baseUrl, config);
  await client.initialize();
  
  return (url: string | URL | Request, options?: RequestInit) => {
    // Handle different input types
    let urlString: string;
    let mergedOptions: RequestInit = options || {};
    
    if (typeof url === 'string') {
      urlString = url;
    } else if (url instanceof URL) {
      urlString = url.toString();
    } else {
      // Request object
      urlString = url.url;
      mergedOptions = {
        method: url.method,
        headers: url.headers,
        body: url.body,
        ...options,
      };
    }
    
    return client.fetch(urlString, mergedOptions);
  };
}

export default createRossettaFetch;
