/**
 * Rossetta Client - Drop-in fetch replacement with E2E encryption
 */
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
export declare class RossettaFetch {
    private baseUrl;
    private publicKey;
    private config;
    private keyRefreshTimer?;
    constructor(baseUrl: string, config?: RossettaConfig);
    /**
     * Initialize the client by fetching the server's public key
     */
    initialize(): Promise<void>;
    /**
     * Fetch the server's public key
     */
    private fetchPublicKey;
    /**
     * Start automatic key refresh
     */
    private startKeyRefresh;
    /**
     * Stop automatic key refresh
     */
    stopKeyRefresh(): void;
    /**
     * Encrypt request data
     */
    private encryptRequest;
    /**
     * Decrypt response data
     */
    private decryptResponse;
    /**
     * Store AES key for response decryption
     */
    private aesKeyStore;
    private storeAESKey;
    private getAESKey;
    /**
     * Fetch with encryption - drop-in replacement for native fetch
     */
    fetch(url: string, options?: RequestInit): Promise<Response>;
}
/**
 * Create a Rossetta fetch function
 *
 * @param baseUrl - Base URL of the API
 * @param config - Optional configuration
 * @returns A fetch function with built-in encryption
 */
export declare function createRossettaFetch(baseUrl: string, config?: RossettaConfig): Promise<typeof fetch>;
export default createRossettaFetch;
