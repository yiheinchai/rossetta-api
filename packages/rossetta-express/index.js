/**
 * @rossetta-api/express
 * Zero-config network request obfuscation middleware for Express.js
 * 
 * Usage:
 *   import { rossettaMiddleware } from '@rossetta-api/express';
 *   app.use(rossettaMiddleware());
 */

import express from 'express';
import crypto from 'crypto';
import expressSession from 'express-session';

const ALGORITHM = 'aes-256-cbc';
const DEFAULT_SECRET = process.env.ROSSETTA_SECRET_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Create Rossetta API middleware
 * @param {Object} options - Configuration options
 * @param {string} options.secret - Secret key for encryption (optional, auto-generated if not provided)
 * @param {number} options.sessionMaxAge - Session max age in milliseconds (default: 24 hours)
 * @param {number} options.timestampWindow - Timestamp validation window in ms (default: 5 minutes)
 * @returns {Function} Express middleware
 */
export function rossettaMiddleware(options = {}) {
  const {
    secret = DEFAULT_SECRET,
    sessionMaxAge = 24 * 60 * 60 * 1000, // 24 hours
    timestampWindow = 5 * 60 * 1000 // 5 minutes
  } = options;

  // Session middleware for key management
  const sessionMiddleware = expressSession({
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: sessionMaxAge
    }
  });

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
    return age >= 0 && age <= timestampWindow;
  }

  /**
   * Main middleware function
   */
  return function rossetta(req, res, next) {
    // Parse text body first for encrypted payloads
    express.text({ type: 'text/plain' })(req, res, () => {
      // Apply session middleware
      sessionMiddleware(req, res, () => {
        // Initialize session if not exists
        if (!req.session.rossettaKey) {
          req.session.rossettaKey = crypto.randomBytes(32).toString('hex');
          req.session.endpointSalt = crypto.randomBytes(16).toString('hex');
        }

        const sessionKey = req.session.rossettaKey;
        const endpointSalt = req.session.endpointSalt;

        // Helper function to encrypt responses
        res.encryptResponse = function(data) {
          const timestamp = Date.now();
          const responsePayload = { data, timestamp };
          const encrypted = encrypt(responsePayload, sessionKey);
          this.setHeader('Content-Type', 'text/plain');
          return this.send(encrypted);
        };

        // Helper to obfuscate endpoints
        req.obfuscateEndpoint = function(endpointName) {
          return obfuscateEndpoint(endpointName, endpointSalt);
        };

        // Store session info for route handlers
        req.rossetta = {
          sessionKey,
          endpointSalt,
          obfuscateEndpoint: (name) => obfuscateEndpoint(name, endpointSalt),
          encrypt: (data) => encrypt(data, sessionKey),
          decrypt: (data) => decrypt(data, sessionKey)
        };

        // Decrypt incoming requests
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
          if (req.body && typeof req.body === 'string') {
            try {
              const decryptedPayload = decrypt(req.body, sessionKey);
              
              // Verify timestamp
              if (!isTimestampValid(decryptedPayload.timestamp)) {
                const encryptedError = encrypt({ error: 'Request expired' }, sessionKey);
                res.status(401).setHeader('Content-Type', 'text/plain').send(encryptedError);
                return;
              }

              // Verify signature
              if (!verifySignature(decryptedPayload.data, decryptedPayload.timestamp, decryptedPayload.signature, sessionKey)) {
                const encryptedError = encrypt({ error: 'Invalid signature' }, sessionKey);
                res.status(401).setHeader('Content-Type', 'text/plain').send(encryptedError);
                return;
              }

              // Replace body with decrypted data
              req.body = decryptedPayload.data;
            } catch (error) {
              console.error('Decryption error:', error.message);
              const encryptedError = encrypt({ error: 'Invalid request format' }, sessionKey);
              res.status(400).setHeader('Content-Type', 'text/plain').send(encryptedError);
              return;
            }
          }
        }

        next();
      });
    });
  };
}

/**
 * Create session initialization route handler
 * Use this to provide session keys to frontend
 */
export function createSessionInitHandler() {
  return function(req, res) {
    res.json({
      sessionKey: req.session.rossettaKey,
      endpointSalt: req.session.endpointSalt
    });
  };
}

export default rossettaMiddleware;
