/**
 * @rossetta-api/client
 * Zero-config obfuscated API client for browser and Node.js
 */

/**
 * Options for configuring the RossettaClient
 */
export interface RossettaClientOptions {
  // Future extension options
}

/**
 * RossettaClient class for making obfuscated API requests
 */
export class RossettaClient {
  /**
   * Base URL of the API server
   */
  readonly baseURL: string;

  /**
   * Session key for encryption
   */
  sessionKey: string | null;

  /**
   * Salt for endpoint obfuscation
   */
  endpointSalt: string | null;

  /**
   * Whether the client has been initialized
   */
  initialized: boolean;

  /**
   * Promise for initialization
   */
  initPromise: Promise<void> | null;

  /**
   * Create a new RossettaClient instance
   * @param baseURL - Base URL of the API server
   * @param options - Optional configuration options
   */
  constructor(baseURL: string, options?: RossettaClientOptions);

  /**
   * Initialize session with server
   * @returns Promise that resolves when session is initialized
   */
  initialize(): Promise<void>;

  /**
   * Derive crypto key from session key
   * @returns Promise that resolves to the derived CryptoKey
   */
  deriveKey(): Promise<CryptoKey>;

  /**
   * Obfuscate endpoint path
   * @param endpoint - Original endpoint path
   * @returns Promise that resolves to obfuscated endpoint path
   */
  obfuscateEndpoint(endpoint: string): Promise<string>;

  /**
   * Encrypt data for transmission
   * @param data - Data to encrypt
   * @returns Promise that resolves to encrypted string
   */
  encrypt(data: any): Promise<string>;

  /**
   * Decrypt received data
   * @param encryptedData - Encrypted data string
   * @returns Promise that resolves to decrypted data
   */
  decrypt(encryptedData: string): Promise<any>;

  /**
   * Create HMAC signature for request
   * @param data - Data to sign
   * @param timestamp - Request timestamp
   * @returns Promise that resolves to signature string
   */
  createSignature(data: any, timestamp: number): Promise<string>;

  /**
   * Make an obfuscated API request
   * @param endpoint - API endpoint path
   * @param method - HTTP method (default: 'GET')
   * @param data - Request data (optional)
   * @returns Promise that resolves to response data
   */
  request(endpoint: string, method?: string, data?: any): Promise<any>;

  /**
   * Make a GET request
   * @param endpoint - API endpoint path
   * @returns Promise that resolves to response data
   */
  get(endpoint: string): Promise<any>;

  /**
   * Make a POST request
   * @param endpoint - API endpoint path
   * @param data - Request data
   * @returns Promise that resolves to response data
   */
  post(endpoint: string, data: any): Promise<any>;

  /**
   * Make a PUT request
   * @param endpoint - API endpoint path
   * @param data - Request data
   * @returns Promise that resolves to response data
   */
  put(endpoint: string, data: any): Promise<any>;

  /**
   * Make a DELETE request
   * @param endpoint - API endpoint path
   * @param data - Optional request data
   * @returns Promise that resolves to response data
   */
  delete(endpoint: string, data?: any): Promise<any>;
}

export default RossettaClient;
