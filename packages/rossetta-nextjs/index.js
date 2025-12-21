/**
 * @rossetta-api/nextjs
 * Zero-config network request obfuscation for Next.js
 * 
 * Usage with App Router:
 *   import { createRossettaHandler } from '@rossetta-api/nextjs';
 *   export const POST = createRossettaHandler(async (data, context) => {
 *     return { result: 'success' };
 *   });
 * 
 * Usage with Pages Router:
 *   import { rossettaMiddleware } from '@rossetta-api/nextjs';
 *   export default rossettaMiddleware(handler);
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const DEFAULT_SECRET = process.env.ROSSETTA_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const TIMESTAMP_WINDOW = 5 * 60 * 1000; // 5 minutes

/**
 * Session management
 */
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  createSession() {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      sessionKey: crypto.randomBytes(32).toString('hex'),
      endpointSalt: crypto.randomBytes(16).toString('hex'),
      createdAt: Date.now()
    };
    this.sessions.set(sessionId, session);
    return { sessionId, ...session };
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}

const sessionManager = new SessionManager();

// Cleanup old sessions periodically
setInterval(() => sessionManager.cleanup(), 60 * 60 * 1000); // Every hour

/**
 * Obfuscate endpoint name
 */
function obfuscateEndpoint(endpoint, salt) {
  const hash = crypto.createHash('sha256').update(endpoint + salt).digest('hex');
  return `/api/${hash.substring(0, 16)}`;
}

/**
 * Encrypt data
 */
function encrypt(data, sessionKey) {
  const jsonString = JSON.stringify(data);
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(sessionKey).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(jsonString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return iv.toString('base64') + ':' + encrypted;
}

/**
 * Decrypt data
 */
function decrypt(encryptedData, sessionKey) {
  const [ivBase64, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const key = crypto.createHash('sha256').update(sessionKey).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

/**
 * Create signature
 */
function createSignature(data, timestamp, sessionKey) {
  const payload = JSON.stringify(data) + timestamp;
  return crypto.createHmac('sha256', sessionKey).update(payload).digest('hex');
}

/**
 * Verify signature
 */
function verifySignature(data, timestamp, signature, sessionKey) {
  const expectedSignature = createSignature(data, timestamp, sessionKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Validate timestamp
 */
function isTimestampValid(timestamp) {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= TIMESTAMP_WINDOW;
}

/**
 * Get or create session from cookies
 */
async function getOrCreateSession(cookieStore) {
  const sessionId = cookieStore.get('rossetta_session')?.value;
  
  if (sessionId) {
    const session = sessionManager.getSession(sessionId);
    if (session) {
      return { sessionId, ...session };
    }
  }
  
  return sessionManager.createSession();
}

/**
 * Create session initialization handler (App Router)
 */
export function createSessionInitHandler() {
  return async function POST(request) {
    // Import cookies dynamically to avoid module-level issues
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const session = await getOrCreateSession(cookieStore);
    
    cookieStore.set('rossetta_session', session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });
    
    return Response.json({
      sessionKey: session.sessionKey,
      endpointSalt: session.endpointSalt
    });
  };
}

/**
 * Create Rossetta handler for App Router
 */
export function createRossettaHandler(handler, options = {}) {
  return async function(request, context) {
    // Import cookies dynamically to avoid module-level issues
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const session = await getOrCreateSession(cookieStore);
    
    cookieStore.set('rossetta_session', session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60
    });
    
    const sessionKey = session.sessionKey;
    const endpointSalt = session.endpointSalt;
    
    try {
      let requestData = null;
      
      // Handle encrypted request body
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
        const body = await request.text();
        if (body) {
          try {
            const decryptedPayload = decrypt(body, sessionKey);
            
            // Verify timestamp
            if (!isTimestampValid(decryptedPayload.timestamp)) {
              const encryptedError = encrypt({ error: 'Request expired' }, sessionKey);
              return new Response(encryptedError, {
                status: 401,
                headers: { 'Content-Type': 'text/plain' }
              });
            }
            
            // Verify signature
            if (!verifySignature(decryptedPayload.data, decryptedPayload.timestamp, decryptedPayload.signature, sessionKey)) {
              const encryptedError = encrypt({ error: 'Invalid signature' }, sessionKey);
              return new Response(encryptedError, {
                status: 401,
                headers: { 'Content-Type': 'text/plain' }
              });
            }
            
            requestData = decryptedPayload.data;
          } catch (error) {
            console.error('Decryption error:', error.message);
            const encryptedError = encrypt({ error: 'Invalid request format' }, sessionKey);
            return new Response(encryptedError, {
              status: 400,
              headers: { 'Content-Type': 'text/plain' }
            });
          }
        }
      }
      
      // Call the actual handler
      const rossettaContext = {
        ...context,
        sessionKey,
        endpointSalt,
        obfuscateEndpoint: (name) => obfuscateEndpoint(name, endpointSalt)
      };
      
      const result = await handler(requestData, rossettaContext);
      
      // Encrypt response
      const timestamp = Date.now();
      const responsePayload = { data: result, timestamp };
      const encrypted = encrypt(responsePayload, sessionKey);
      
      return new Response(encrypted, {
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (error) {
      console.error('Handler error:', error);
      const errorPayload = encrypt({ error: 'Internal server error' }, sessionKey);
      return new Response(errorPayload, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  };
}

/**
 * Middleware for Pages Router API routes
 */
export function rossettaMiddleware(handler, options = {}) {
  return async function(req, res) {
    // Get or create session
    const sessionId = req.cookies.rossetta_session;
    let session;
    
    if (sessionId) {
      session = sessionManager.getSession(sessionId);
    }
    
    if (!session) {
      const newSession = sessionManager.createSession();
      session = newSession;
      res.setHeader('Set-Cookie', `rossetta_session=${newSession.sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    }
    
    const sessionKey = session.sessionKey;
    const endpointSalt = session.endpointSalt;
    
    // Add helper methods to req/res
    req.rossetta = {
      sessionKey,
      endpointSalt,
      obfuscateEndpoint: (name) => obfuscateEndpoint(name, endpointSalt),
      encrypt: (data) => encrypt(data, sessionKey),
      decrypt: (data) => decrypt(data, sessionKey)
    };
    
    res.encryptResponse = function(data) {
      const timestamp = Date.now();
      const responsePayload = { data, timestamp };
      const encrypted = encrypt(responsePayload, sessionKey);
      this.setHeader('Content-Type', 'text/plain');
      return this.send(encrypted);
    };
    
    // Decrypt incoming requests
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      if (req.body && typeof req.body === 'string') {
        try {
          const decryptedPayload = decrypt(req.body, sessionKey);
          
          // Verify timestamp
          if (!isTimestampValid(decryptedPayload.timestamp)) {
            return res.status(401).setHeader('Content-Type', 'text/plain').send(encrypt({ error: 'Request expired' }, sessionKey));
          }
          
          // Verify signature
          if (!verifySignature(decryptedPayload.data, decryptedPayload.timestamp, decryptedPayload.signature, sessionKey)) {
            return res.status(401).setHeader('Content-Type', 'text/plain').send(encrypt({ error: 'Invalid signature' }, sessionKey));
          }
          
          req.body = decryptedPayload.data;
        } catch (error) {
          console.error('Decryption error:', error.message);
          return res.status(400).setHeader('Content-Type', 'text/plain').send(encrypt({ error: 'Invalid request format' }, sessionKey));
        }
      }
    }
    
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      res.status(500).setHeader('Content-Type', 'text/plain').send(encrypt({ error: 'Internal server error' }, sessionKey));
    }
  };
}

export { obfuscateEndpoint, encrypt, decrypt, createSignature, verifySignature };
export default rossettaMiddleware;
