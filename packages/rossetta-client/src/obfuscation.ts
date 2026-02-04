/**
 * Google-style BatchExecute/Wrb.fr obfuscation layer
 * Transforms encrypted payloads into Google API-like format for enhanced obfuscation
 * 
 * This module implements a sophisticated obfuscation scheme that mimics Google's 
 * BatchExecute API responses, making it harder to identify encrypted data within 
 * network traffic.
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
 * Reverse Unicode escaping applied during encoding
 */
function unescapeUnicode(s: string): string {
  const replacements: Record<string, string> = {
    '\\u003d': '=',
    '\\u003c': '<',
    '\\u003e': '>',
    '\\u0026': '&',
  };
  let result = s;
  for (const [escape, char] of Object.entries(replacements)) {
    result = result.split(escape).join(char);
  }
  return result;
}

// Marker prefix used to identify scattered data during reassembly
const DATA_SCATTER_MARKER = 'RX1';

/**
 * Reassemble scattered data parts by joining them and removing the marker prefix.
 */
function reassembleScatteredData(parts: string[]): string | null {
  if (parts.length === 0) {
    return null;
  }
  
  const combined = parts.join('');
  
  // Check for our marker prefix
  if (combined.startsWith(DATA_SCATTER_MARKER)) {
    return combined.slice(DATA_SCATTER_MARKER.length);  // Remove marker
  }
  
  return null;
}

/**
 * Parse Google's multi-segment response format
 * 
 * Format: <length>\n<json_segment><length>\n<json_segment>...
 */
function parseGoogleSegments(body: string): unknown[] {
  const segments: unknown[] = [];
  let remaining = body.trim();
  
  while (remaining.length > 0) {
    // Find the length prefix
    const newlineIdx = remaining.indexOf('\n');
    if (newlineIdx === -1) {
      break;
    }
    
    const lengthStr = remaining.slice(0, newlineIdx);
    if (!/^\d+$/.test(lengthStr)) {
      break;
    }
    
    const segmentLength = parseInt(lengthStr, 10);
    const segmentStart = newlineIdx + 1;
    const segmentEnd = segmentStart + segmentLength;
    
    let segmentStr: string;
    if (segmentEnd > remaining.length) {
      // Partial segment - try to parse what we have
      segmentStr = remaining.slice(segmentStart);
    } else {
      segmentStr = remaining.slice(segmentStart, segmentEnd);
    }
    
    try {
      const segment = JSON.parse(segmentStr);
      segments.push(segment);
    } catch {
      // Skip invalid segments
    }
    
    remaining = segmentEnd <= remaining.length ? remaining.slice(segmentEnd) : '';
  }
  
  return segments;
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
 * 
 * Handles both the new sophisticated scattered format and the legacy format
 */
export function decodeResponseFromGoogleFormat(body: string): { ciphertext: string; iv: string } | null {
  try {
    // Parse the multi-segment response
    const segments = parseGoogleSegments(body);
    
    if (segments.length === 0) {
      return null;
    }
    
    // Find the wrb.fr segment
    let wrbFrData: unknown[] | null = null;
    for (const segment of segments) {
      if (Array.isArray(segment) && segment.length > 0) {
        const inner = segment[0];
        if (Array.isArray(inner) && inner.length >= 3 && inner[0] === 'wrb.fr') {
          wrbFrData = inner;
          break;
        }
      }
    }
    
    if (!wrbFrData) {
      return null;
    }
    
    // Parse the inner payload
    const innerStr = wrbFrData[2] as string;
    const inner = JSON.parse(innerStr);
    
    if (!Array.isArray(inner)) {
      return null;
    }
    
    // Extract scattered ciphertext and IV parts from the nested structure
    // Structure documentation (matching Python encode_response_to_google_format):
    // - inner[4][0][0][1][1]: ciphertext part 1 (in resource metadata)
    // - inner[4][0][0][6][5]: IV part 1 (in multi-carrier info)  
    // - inner[7]: ciphertext part 2 (standalone slot)
    // - inner[8][2]: ciphertext part 3 (in timestamp array)
    // - inner[9]: IV part 2 (standalone slot)
    const ctParts: string[] = [];
    const ivParts: string[] = [];
    
    // Ciphertext part 1: inner[4][0][0][1][1] (in resource metadata)
    try {
      const part = (inner as unknown[])[4];
      if (Array.isArray(part) && part[0] && Array.isArray(part[0][0]) && part[0][0][1]) {
        const val = part[0][0][1][1];
        if (typeof val === 'string') {
          ctParts.push(unescapeUnicode(val));
        }
      }
    } catch {
      // Part not found
    }
    
    // Ciphertext part 2: inner[7] (standalone slot)
    try {
      const val = (inner as unknown[])[7];
      if (typeof val === 'string') {
        ctParts.push(unescapeUnicode(val));
      }
    } catch {
      // Part not found
    }
    
    // Ciphertext part 3: inner[8][2] (in timestamp array)
    try {
      const arr = (inner as unknown[])[8];
      if (Array.isArray(arr) && typeof arr[2] === 'string') {
        ctParts.push(unescapeUnicode(arr[2]));
      }
    } catch {
      // Part not found
    }
    
    // IV part 1: inner[4][0][0][6][5] (in multi-carrier info)
    try {
      const part = (inner as unknown[])[4];
      if (Array.isArray(part) && part[0] && Array.isArray(part[0][0]) && part[0][0][6]) {
        const val = part[0][0][6][5];
        if (typeof val === 'string') {
          ivParts.push(unescapeUnicode(val));
        }
      }
    } catch {
      // Part not found
    }
    
    // IV part 2: inner[9] (standalone slot)
    try {
      const val = (inner as unknown[])[9];
      if (typeof val === 'string') {
        ivParts.push(unescapeUnicode(val));
      }
    } catch {
      // Part not found
    }
    
    // Reassemble the scattered parts back into complete data
    if (ctParts.length > 0 && ivParts.length > 0) {
      const ciphertext = reassembleScatteredData(ctParts);
      const iv = reassembleScatteredData(ivParts);
      
      if (ciphertext && iv) {
        return { ciphertext, iv };
      }
    }
    
    // Fallback to legacy format (positions 3 and 4)
    const legacyCiphertext = inner[3];
    const legacyIv = inner[4];
    
    if (typeof legacyCiphertext === 'string' && typeof legacyIv === 'string') {
      return { ciphertext: legacyCiphertext, iv: legacyIv };
    }
    
    return null;
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
