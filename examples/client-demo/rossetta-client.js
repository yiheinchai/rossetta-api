// src/crypto.ts
async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}
async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}
async function importPublicKey(base64Key) {
  const buffer = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
}
async function deriveSharedSecret(privateKey, publicKey) {
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    256
  );
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array([]),
      info: new TextEncoder().encode("rossetta-api")
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encrypt(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoded
  );
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}
async function decrypt(key, ciphertext, iv) {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer
    },
    key,
    ciphertextBuffer
  );
  return new TextDecoder().decode(decrypted);
}
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array);
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// src/session.ts
var SessionManager = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
    this.keyPairs = /* @__PURE__ */ new Map();
    this.SESSION_DURATION = 36e5;
  }
  // 1 hour in milliseconds
  /**
   * Get or create session for a base URL
   */
  async getSession(baseUrl) {
    const existing = this.sessions.get(baseUrl);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.sharedKey;
    }
    return await this.createSession(baseUrl);
  }
  /**
   * Create a new session with key exchange
   */
  async createSession(baseUrl) {
    const keyPair = await generateKeyPair();
    this.keyPairs.set(baseUrl, keyPair);
    const clientPublicKey = await exportPublicKey(keyPair.publicKey);
    const handshakeUrl = `${baseUrl}/__rossetta_handshake__`;
    const response = await fetch(handshakeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_public_key: clientPublicKey
      })
    });
    if (!response.ok) {
      throw new Error(`Key exchange failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const serverPublicKey = await importPublicKey(data.server_public_key);
    const sharedKey = await deriveSharedSecret(keyPair.privateKey, serverPublicKey);
    this.sessions.set(baseUrl, {
      sharedKey,
      expiresAt: Date.now() + this.SESSION_DURATION
    });
    return sharedKey;
  }
  /**
   * Clear session for a base URL
   */
  clearSession(baseUrl) {
    this.sessions.delete(baseUrl);
    this.keyPairs.delete(baseUrl);
  }
  /**
   * Clear all sessions
   */
  clearAllSessions() {
    this.sessions.clear();
    this.keyPairs.clear();
  }
};
var sessionManager = new SessionManager();

// src/index.ts
function getBaseUrl(url) {
  const urlObj = typeof url === "string" ? new URL(url) : url;
  return `${urlObj.protocol}//${urlObj.host}`;
}
function isHandshakeUrl(url) {
  const urlStr = typeof url === "string" ? url : url.toString();
  return urlStr.includes("__rossetta_handshake__");
}
async function rossettaFetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (isHandshakeUrl(url)) {
    return fetch(input, init);
  }
  try {
    const baseUrl = getBaseUrl(url);
    const sharedKey = await sessionManager.getSession(baseUrl);
    const method = init?.method || "GET";
    const headers = init?.headers || {};
    const body = init?.body;
    const timestamp = Date.now();
    const nonce = generateNonce();
    let headersObj = {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        headersObj[key] = value;
      });
    } else if (headers) {
      headersObj = headers;
    }
    let bodyStr = null;
    if (body) {
      if (typeof body === "string") {
        bodyStr = body;
      } else if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
        throw new Error("FormData, Blob, and ArrayBuffer are not yet supported. Use JSON or string body.");
      } else {
        bodyStr = JSON.stringify(body);
      }
    }
    const payload = {
      method,
      url,
      headers: headersObj,
      body: bodyStr,
      timestamp,
      nonce
    };
    const { ciphertext, iv } = await encrypt(sharedKey, JSON.stringify(payload));
    const encryptedResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Rossetta-Encrypted": "true"
      },
      body: JSON.stringify({
        ciphertext,
        iv
      })
    });
    if (!encryptedResponse.ok) {
      throw new Error(`Request failed: ${encryptedResponse.status} ${encryptedResponse.statusText}`);
    }
    const encryptedData = await encryptedResponse.json();
    const decryptedResponse = await decrypt(
      sharedKey,
      encryptedData.ciphertext,
      encryptedData.iv
    );
    const responseData = JSON.parse(decryptedResponse);
    return new Response(
      responseData.body ? JSON.stringify(responseData.body) : null,
      {
        status: responseData.status,
        statusText: responseData.statusText || "",
        headers: new Headers(responseData.headers || {})
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Rossetta encryption error: ${error.message}`);
    }
    throw error;
  }
}
var index_default = rossettaFetch;
export {
  index_default as default,
  rossettaFetch as fetch
};
