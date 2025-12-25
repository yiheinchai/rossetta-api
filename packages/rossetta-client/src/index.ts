/**
 * Main rossetta-client implementation
 * Drop-in replacement for fetch API with e2e encryption
 */

import { encrypt, decrypt, generateNonce } from './crypto';
import { sessionManager } from './session';

/**
 * Extract base URL from a full URL
 */
function getBaseUrl(url: string | URL): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return `${urlObj.protocol}//${urlObj.host}`;
}

/**
 * Check if URL is the handshake endpoint
 */
function isHandshakeUrl(url: string | URL): boolean {
  const urlStr = typeof url === 'string' ? url : url.toString();
  return urlStr.includes('__rossetta_handshake__');
}

/**
 * Rossetta fetch - drop-in replacement for native fetch with e2e encryption
 */
async function rossettaFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // Skip encryption for handshake endpoint
  if (isHandshakeUrl(url)) {
    return fetch(input, init);
  }

  try {
    // Get or create session
    const baseUrl = getBaseUrl(url);
    const sharedKey = await sessionManager.getSession(baseUrl);

    // Prepare request data
    const method = init?.method || 'GET';
    const headers = init?.headers || {};
    const body = init?.body;

    // Create encrypted payload
    const timestamp = Date.now();
    const nonce = generateNonce();
    
    // Convert headers to plain object
    let headersObj: Record<string, string> = {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        headersObj[key] = value;
      });
    } else {
      headersObj = headers as Record<string, string>;
    }

    const payload = {
      method,
      url,
      headers: headersObj,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
      timestamp,
      nonce,
    };

    const { ciphertext, iv } = await encrypt(sharedKey, JSON.stringify(payload));

    // Make encrypted request
    const encryptedResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Rossetta-Encrypted': 'true',
      },
      body: JSON.stringify({
        ciphertext,
        iv,
      }),
    });

    if (!encryptedResponse.ok) {
      throw new Error(`Request failed: ${encryptedResponse.status} ${encryptedResponse.statusText}`);
    }

    // Decrypt response
    const encryptedData = await encryptedResponse.json();
    const decryptedResponse = await decrypt(
      sharedKey,
      encryptedData.ciphertext,
      encryptedData.iv
    );

    const responseData = JSON.parse(decryptedResponse);

    // Create Response object that mimics native fetch response
    return new Response(
      responseData.body ? JSON.stringify(responseData.body) : null,
      {
        status: responseData.status,
        statusText: responseData.statusText || '',
        headers: new Headers(responseData.headers || {}),
      }
    );
  } catch (error) {
    // If encryption fails, provide meaningful error
    if (error instanceof Error) {
      throw new Error(`Rossetta encryption error: ${error.message}`);
    }
    throw error;
  }
}

export default rossettaFetch;
export { rossettaFetch as fetch };
