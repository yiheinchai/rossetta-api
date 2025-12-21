/**
 * Tests for @rossetta-api/nextjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

// Import functions to test
import { obfuscateEndpoint, encrypt, decrypt, createSignature, verifySignature } from '../index.js';

describe('NextJS Package Tests', () => {
  const testSessionKey = 'test-session-key-12345678901234567890';
  const testSalt = 'test-salt';
  
  it('should obfuscate endpoint correctly', () => {
    const endpoint = 'test-endpoint';
    const obfuscated = obfuscateEndpoint(endpoint, testSalt);
    
    assert.ok(obfuscated.startsWith('/api/'));
    assert.strictEqual(obfuscated.length, 21); // '/api/' + 16 chars
  });
  
  it('should encrypt and decrypt data correctly', () => {
    const testData = { message: 'Hello World', number: 42 };
    
    const encrypted = encrypt(testData, testSessionKey);
    assert.ok(encrypted.includes(':'));
    
    const decrypted = decrypt(encrypted, testSessionKey);
    assert.deepStrictEqual(decrypted, testData);
  });
  
  it('should create and verify signature correctly', () => {
    const testData = { test: 'data' };
    const timestamp = Date.now();
    
    const signature = createSignature(testData, timestamp, testSessionKey);
    assert.ok(signature);
    assert.strictEqual(typeof signature, 'string');
    assert.strictEqual(signature.length, 64); // SHA-256 hex length
    
    const isValid = verifySignature(testData, timestamp, signature, testSessionKey);
    assert.strictEqual(isValid, true);
  });
  
  it('should reject invalid signature', () => {
    const testData = { test: 'data' };
    const timestamp = Date.now();
    const signature = createSignature(testData, timestamp, testSessionKey);
    
    // Modify data
    const modifiedData = { test: 'modified' };
    const isValid = verifySignature(modifiedData, timestamp, signature, testSessionKey);
    assert.strictEqual(isValid, false);
  });
  
  it('should handle complex data structures', () => {
    const complexData = {
      array: [1, 2, 3],
      nested: {
        key: 'value',
        number: 123
      },
      boolean: true,
      null: null
    };
    
    const encrypted = encrypt(complexData, testSessionKey);
    const decrypted = decrypt(encrypted, testSessionKey);
    assert.deepStrictEqual(decrypted, complexData);
  });
  
  it('should generate different IV for each encryption', () => {
    const testData = { message: 'Same data' };
    
    const encrypted1 = encrypt(testData, testSessionKey);
    const encrypted2 = encrypt(testData, testSessionKey);
    
    // Different IVs mean different encrypted outputs
    assert.notStrictEqual(encrypted1, encrypted2);
    
    // But both decrypt to same data
    const decrypted1 = decrypt(encrypted1, testSessionKey);
    const decrypted2 = decrypt(encrypted2, testSessionKey);
    assert.deepStrictEqual(decrypted1, testData);
    assert.deepStrictEqual(decrypted2, testData);
  });
});

console.log('✅ All NextJS package tests passed!');
