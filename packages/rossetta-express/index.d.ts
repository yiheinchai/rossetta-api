/**
 * @rossetta-api/express
 * Zero-config network request obfuscation middleware for Express.js
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Rossetta-specific data attached to the request object
 */
export interface RossettaData {
  /**
   * Session key for encryption
   */
  sessionKey: string;

  /**
   * Salt for endpoint obfuscation
   */
  endpointSalt: string;

  /**
   * Obfuscate an endpoint path
   * @param name - Original endpoint path
   * @returns Obfuscated endpoint path
   */
  obfuscateEndpoint(name: string): string;

  /**
   * Encrypt data
   * @param data - Data to encrypt
   * @returns Encrypted string
   */
  encrypt(data: any): string;

  /**
   * Decrypt data
   * @param data - Encrypted data string
   * @returns Decrypted data
   */
  decrypt(data: string): any;
}

/**
 * Extended Express Request with Rossetta-specific properties
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Rossetta-specific data and methods
       */
      rossetta?: RossettaData;
    }

    interface Response {
      /**
       * Encrypt and send response data
       * @param data - Data to encrypt and send
       * @returns Response object for chaining
       */
      encryptResponse?(data: any): Response;
    }
  }
}

/**
 * Options for configuring the Rossetta middleware
 */
export interface RossettaMiddlewareOptions {
  /**
   * Secret key for encryption (optional, auto-generated if not provided)
   */
  secret?: string;

  /**
   * Session max age in milliseconds (default: 24 hours)
   */
  sessionMaxAge?: number;

  /**
   * Timestamp validation window in milliseconds (default: 5 minutes)
   */
  timestampWindow?: number;
}

/**
 * Create Rossetta API middleware
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function rossettaMiddleware(options?: RossettaMiddlewareOptions): RequestHandler;

/**
 * Create session initialization route handler
 * Use this to provide session keys to frontend
 * @returns Express route handler
 */
export function createSessionInitHandler(): RequestHandler;

export default rossettaMiddleware;
