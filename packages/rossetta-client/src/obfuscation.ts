/**
 * Google-style BatchExecute/Wrb.fr obfuscation layer
 * Transforms encrypted payloads into Google API-like format for enhanced obfuscation
 */

/**
 * Session state for Google-style requests
 */
interface SessionState {
  sid: string;
  reqId: number;
  at: string;
}

// Global session state
let sessionState: SessionState | null = null;

/**
 * Generate a random session ID (f.sid format)
 */
function generateSessionId(): string {
  // Generate a 19-digit numeric string like Google's f.sid
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < 19; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate an action token (CSRF-like token)
 */
function generateActionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'AMsTio';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Add timestamp component
  result += ':' + Date.now();
  return result;
}

/**
 * Initialize or get session state
 */
export function getSessionState(): SessionState {
  if (!sessionState) {
    sessionState = {
      sid: generateSessionId(),
      reqId: Math.floor(Math.random() * 100000),
      at: generateActionToken(),
    };
  }
  return sessionState;
}

/**
 * Reset session state (useful for testing)
 */
export function resetSessionState(): void {
  sessionState = null;
}

/**
 * Increment request ID
 */
export function incrementReqId(): number {
  const state = getSessionState();
  state.reqId += Math.floor(Math.random() * 1000) + 100;
  return state.reqId;
}

/**
 * Generate Google-style request headers
 */
export function generateRequestHeaders(): Record<string, string> {
  const state = getSessionState();
  return {
    'f.sid': state.sid,
    'bl': 'boq_rossetta-frontend-ui_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.01_p0',
    'hl': 'en-GB',
    'gl': 'GB',
    'soc-app': '162',
    'soc-platform': '1',
    'soc-device': '1',
    '_reqid': String(incrementReqId()),
    'rt': 'c',
  };
}

/**
 * Encode encrypted data into Google BatchExecute-style format
 * 
 * Transforms { ciphertext, iv } into a nested array structure
 * that mimics Google's internal API format
 */
export function encodeToGoogleFormat(ciphertext: string, iv: string): {
  formData: Record<string, string>;
  headers: Record<string, string>;
} {
  const state = getSessionState();
  const timestamp = Date.now();
  
  // Create nested array structure similar to Google's format
  // The structure includes: wrb.fr wrapper, encrypted data, metadata
  const innerPayload = [
    null,
    [
      [timestamp, Math.floor(Math.random() * 1000000000), Math.floor(Math.random() * 10000000000)],
      null,
      null,
      null,
      null,
      [[1]]
    ],
    0,
    ciphertext,  // Our encrypted ciphertext
    iv,          // Our IV
  ];
  
  const wrbFrPayload = [
    ['wrb.fr', null, JSON.stringify(innerPayload)]
  ];
  
  // The f.req field contains the nested array structure
  const fReq = JSON.stringify([
    null,
    JSON.stringify(wrbFrPayload)
  ]);
  
  return {
    formData: {
      'f.req': fReq,
      'at': state.at,
    },
    headers: generateRequestHeaders(),
  };
}

/**
 * Decode Google BatchExecute-style format back to original encrypted data
 * 
 * Extracts { ciphertext, iv } from the nested array structure
 */
export function decodeFromGoogleFormat(body: string): { ciphertext: string; iv: string } | null {
  try {
    // Parse the outer structure
    const parsed = JSON.parse(body);
    
    if (!Array.isArray(parsed) || parsed.length < 2) {
      return null;
    }
    
    // Parse the inner wrapper string
    const innerStr = parsed[1];
    const inner = JSON.parse(innerStr);
    
    if (!Array.isArray(inner) || inner.length === 0) {
      return null;
    }
    
    // Get the wrb.fr payload
    const wrbFr = inner[0];
    if (!Array.isArray(wrbFr) || wrbFr.length < 3 || wrbFr[0] !== 'wrb.fr') {
      return null;
    }
    
    // Parse the innermost payload
    const payloadStr = wrbFr[2];
    const payload = JSON.parse(payloadStr);
    
    if (!Array.isArray(payload) || payload.length < 5) {
      return null;
    }
    
    // Extract ciphertext and iv from our positions
    const ciphertext = payload[3];
    const iv = payload[4];
    
    if (typeof ciphertext !== 'string' || typeof iv !== 'string') {
      return null;
    }
    
    return { ciphertext, iv };
  } catch {
    return null;
  }
}

/**
 * Encode response in Google BatchExecute-style format
 * 
 * Creates a response format that mimics Google's API responses
 */
export function encodeResponseToGoogleFormat(ciphertext: string, iv: string): string {
  const timestamp = Date.now();
  
  // Create the response structure
  const responsePayload = [
    null,
    [
      [timestamp, Math.floor(Math.random() * 1000000000), Math.floor(Math.random() * 10000000000)],
      null,
      null,
      null,
      null,
      [[2]]
    ],
    1,
    ciphertext,
    iv,
  ];
  
  // Wrap in wrb.fr format
  const wrbFrResponse = [
    ['wrb.fr', null, JSON.stringify(responsePayload)]
  ];
  
  // Add length prefix like Google does
  const responseStr = JSON.stringify(wrbFrResponse);
  const lengthPrefix = String(responseStr.length);
  
  return lengthPrefix + '\n' + responseStr;
}

/**
 * Decode Google BatchExecute-style response to original encrypted data
 */
export function decodeResponseFromGoogleFormat(body: string): { ciphertext: string; iv: string } | null {
  try {
    // Remove length prefix if present
    const lines = body.split('\n');
    let jsonStr = body;
    
    // Check if first line is a number (length prefix)
    if (lines.length >= 2 && /^\d+$/.test(lines[0].trim())) {
      jsonStr = lines.slice(1).join('\n');
    }
    
    // Parse the response
    const parsed = JSON.parse(jsonStr);
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    
    // Get the wrb.fr payload
    const wrbFr = parsed[0];
    if (!Array.isArray(wrbFr) || wrbFr.length < 3 || wrbFr[0] !== 'wrb.fr') {
      return null;
    }
    
    // Parse the innermost payload
    const payloadStr = wrbFr[2];
    const payload = JSON.parse(payloadStr);
    
    if (!Array.isArray(payload) || payload.length < 5) {
      return null;
    }
    
    // Extract ciphertext and iv
    const ciphertext = payload[3];
    const iv = payload[4];
    
    if (typeof ciphertext !== 'string' || typeof iv !== 'string') {
      return null;
    }
    
    return { ciphertext, iv };
  } catch {
    return null;
  }
}

/**
 * Convert form data to URL-encoded format
 */
export function toFormUrlEncoded(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}
