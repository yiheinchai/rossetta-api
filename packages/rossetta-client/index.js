/**
 * @rossetta-api/client
 * Zero-config obfuscated API client
 *
 * Usage:
 *   import RossettaClient from '@rossetta-api/client';
 *   const client = new RossettaClient('http://localhost:3001');
 *   await client.post('/todos', { text: 'Buy milk' });
 */

export class RossettaClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.sessionKey = null;
    this.endpointSalt = null;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize session with server
   */
  async initialize() {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/api/init-session`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to initialize session");
        }

        const data = await response.json();
        this.sessionKey = data.sessionKey;
        this.endpointSalt = data.endpointSalt;
        this.initialized = true;
      } catch (error) {
        console.error("Session initialization failed:", error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Derive crypto key from session key
   */
  async deriveKey() {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(this.sessionKey)
    );
    return crypto.subtle.importKey(
      "raw",
      hashBuffer,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Obfuscate endpoint
   */
  async obfuscateEndpoint(endpoint) {
    const encoder = new TextEncoder();
    const data = encoder.encode(endpoint + this.endpointSalt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `/api/${hashHex.substring(0, 16)}`;
  }

  /**
   * Encrypt data
   */
  async encrypt(data) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const jsonString = JSON.stringify(data);
    const key = await this.deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      key,
      encoder.encode(jsonString)
    );

    const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
    const encryptedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encrypted))
    );

    return ivBase64 + ":" + encryptedBase64;
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData) {
    const decoder = new TextDecoder();
    const [ivBase64, encryptedBase64] = encryptedData.split(":");

    const iv = new Uint8Array(
      atob(ivBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const encrypted = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const key = await this.deriveKey();

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      encrypted
    );

    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  }

  /**
   * Create signature
   */
  async createSignature(data, timestamp) {
    const encoder = new TextEncoder();
    const payload = JSON.stringify(data) + timestamp;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.sessionKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const signatureArray = Array.from(new Uint8Array(signature));
    return signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Make an obfuscated API request
   */
  async request(endpoint, method = "GET", data = null) {
    await this.initialize();

    const obfuscatedEndpoint = await this.obfuscateEndpoint(endpoint);
    const url = this.baseURL + obfuscatedEndpoint;

    const options = {
      method,
      headers: {
        "Content-Type": "text/plain",
      },
      credentials: "include",
    };

    if (
      data &&
      (method === "POST" || method === "PUT" || method === "DELETE")
    ) {
      const timestamp = Date.now();
      const signature = await this.createSignature(data, timestamp);

      const payload = {
        data,
        timestamp,
        signature,
      };

      const encryptedPayload = await this.encrypt(payload);
      options.body = encryptedPayload;
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const encryptedResponse = await response.text();
    const decryptedResponse = await this.decrypt(encryptedResponse);

    return decryptedResponse.data;
  }

  /**
   * HTTP method helpers
   */
  async get(endpoint) {
    return this.request(endpoint, "GET");
  }

  async post(endpoint, data) {
    return this.request(endpoint, "POST", data);
  }

  async put(endpoint, data) {
    return this.request(endpoint, "PUT", data);
  }

  async delete(endpoint, data) {
    return this.request(endpoint, "DELETE", data);
  }
}

export default RossettaClient;
