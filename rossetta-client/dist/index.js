"use strict";
/**
 * Rossetta Client - Drop-in fetch replacement with E2E encryption
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RossettaFetch = void 0;
exports.createRossettaFetch = createRossettaFetch;
const crypto_1 = require("./crypto");
/**
 * Rossetta Fetch Client
 */
class RossettaFetch {
    constructor(baseUrl, config = {}) {
        this.publicKey = null;
        /**
         * Store AES key for response decryption
         */
        this.aesKeyStore = new Map();
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
    async initialize() {
        await this.fetchPublicKey();
        if (this.config.autoRefreshKey) {
            this.startKeyRefresh();
        }
    }
    /**
     * Fetch the server's public key
     */
    async fetchPublicKey() {
        const response = await fetch(`${this.baseUrl}${this.config.publicKeyUrl}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch public key: ${response.statusText}`);
        }
        const data = await response.json();
        this.publicKey = await (0, crypto_1.importPublicKey)(data.public_key);
    }
    /**
     * Start automatic key refresh
     */
    startKeyRefresh() {
        this.keyRefreshTimer = window.setInterval(() => {
            this.fetchPublicKey().catch(console.error);
        }, this.config.keyRefreshInterval);
    }
    /**
     * Stop automatic key refresh
     */
    stopKeyRefresh() {
        if (this.keyRefreshTimer) {
            clearInterval(this.keyRefreshTimer);
            this.keyRefreshTimer = undefined;
        }
    }
    /**
     * Encrypt request data
     */
    async encryptRequest(url, options = {}) {
        if (!this.publicKey) {
            throw new Error('Public key not loaded. Call initialize() first.');
        }
        // Generate AES key for this request
        const aesKey = await (0, crypto_1.generateAESKey)();
        const aesKeyRaw = await (0, crypto_1.exportAESKey)(aesKey);
        // Prepare request data
        const requestData = {
            method: options.method || 'GET',
            url,
            headers: options.headers || {},
            body: options.body ? JSON.parse(options.body) : null,
        };
        // Serialize to JSON
        const encoder = new TextEncoder();
        const jsonData = encoder.encode(JSON.stringify(requestData));
        // Encrypt data with AES
        const { ciphertext, nonce: aesNonce, tag } = await (0, crypto_1.encryptWithAES)(jsonData.buffer, aesKey);
        // Combine nonce + tag + ciphertext
        const combined = (0, crypto_1.combineArrayBuffers)(aesNonce, tag, ciphertext);
        // Encrypt AES key with RSA
        const encryptedKey = await (0, crypto_1.encryptWithRSA)(aesKeyRaw, this.publicKey);
        // Generate nonce and timestamp
        const nonce = (0, crypto_1.generateNonce)();
        const timestamp = Math.floor(Date.now() / 1000);
        // Create signature
        const encryptedDataB64 = (0, crypto_1.arrayBufferToBase64)(combined);
        const signature = await (0, crypto_1.createSignature)(`${encryptedDataB64}${nonce}${timestamp}`);
        // Store AES key for response decryption
        this.storeAESKey(nonce, aesKey);
        return {
            encrypted_data: encryptedDataB64,
            encrypted_key: (0, crypto_1.arrayBufferToBase64)(encryptedKey),
            nonce,
            timestamp,
            signature,
        };
    }
    /**
     * Decrypt response data
     */
    async decryptResponse(encryptedResponse, aesKey) {
        const combined = (0, crypto_1.base64ToArrayBuffer)(encryptedResponse.encrypted_data);
        const combinedArray = new Uint8Array(combined);
        // Extract nonce (12 bytes), tag (16 bytes), and ciphertext
        const nonce = combinedArray.slice(0, 12).buffer;
        const tag = combinedArray.slice(12, 28).buffer;
        const ciphertext = combinedArray.slice(28).buffer;
        // Decrypt with AES
        const decrypted = await (0, crypto_1.decryptWithAES)(ciphertext, aesKey, nonce, tag);
        // Parse JSON
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decrypted);
        return JSON.parse(jsonString);
    }
    storeAESKey(nonce, key) {
        this.aesKeyStore.set(nonce, key);
        // Clean up old keys after 10 minutes
        setTimeout(() => {
            this.aesKeyStore.delete(nonce);
        }, 600000);
    }
    getAESKey(nonce) {
        return this.aesKeyStore.get(nonce);
    }
    /**
     * Fetch with encryption - drop-in replacement for native fetch
     */
    async fetch(url, options = {}) {
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
exports.RossettaFetch = RossettaFetch;
/**
 * Create a Rossetta fetch function
 *
 * @param baseUrl - Base URL of the API
 * @param config - Optional configuration
 * @returns A fetch function with built-in encryption
 */
async function createRossettaFetch(baseUrl, config) {
    const client = new RossettaFetch(baseUrl, config);
    await client.initialize();
    return (url, options) => {
        // Handle different input types
        let urlString;
        let mergedOptions = options || {};
        if (typeof url === 'string') {
            urlString = url;
        }
        else if (url instanceof URL) {
            urlString = url.toString();
        }
        else {
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
exports.default = createRossettaFetch;
