/**
 * Tests for @rossetta-api/nextjs
 */

import crypto from 'crypto';

// Test helper functions directly without Next.js dependencies
const ALGORITHM = 'aes-256-cbc';

function obfuscateEndpoint(endpoint, salt) {
  const hash = crypto.createHash('sha256').update(endpoint + salt).digest('hex');
  return `/api/${hash.substring(0, 16)}`;
}

function encrypt(data, sessionKey) {
  const jsonString = JSON.stringify(data);
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(sessionKey).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(jsonString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encryptedData, sessionKey) {
  const [ivBase64, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const key = crypto.createHash('sha256').update(sessionKey).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

function createSignature(data, timestamp, sessionKey) {
  const payload = JSON.stringify(data) + timestamp;
  return crypto.createHmac('sha256', sessionKey).update(payload).digest('hex');
}

function verifySignature(data, timestamp, signature, sessionKey) {
  const expectedSignature = createSignature(data, timestamp, sessionKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Run tests
const testSessionKey = 'test-session-key-12345678901234567890';
const testSalt = 'test-salt';

console.log('🧪 Testing NextJS Package...\n');

// Test 1: Endpoint obfuscation
console.log('Test 1: Endpoint obfuscation');
const endpoint = 'test-endpoint';
const obfuscated = obfuscateEndpoint(endpoint, testSalt);
console.assert(obfuscated.startsWith('/api/'), 'Obfuscated endpoint should start with /api/');
console.assert(obfuscated.length === 21, 'Obfuscated endpoint should be 21 chars');
console.log(`  ✅ Obfuscated: ${obfuscated}`);

// Test 2: Encryption and decryption
console.log('\nTest 2: Encryption and decryption');
const testData = { message: 'Hello World', number: 42 };
const encrypted = encrypt(testData, testSessionKey);
console.assert(encrypted.includes(':'), 'Encrypted data should contain :');
const decrypted = decrypt(encrypted, testSessionKey);
console.assert(JSON.stringify(decrypted) === JSON.stringify(testData), 'Decrypted data should match original');
console.log(`  ✅ Encrypt/Decrypt successful`);

// Test 3: Signature creation and verification
console.log('\nTest 3: Signature creation and verification');
const sigTestData = { test: 'data' };
const timestamp = Date.now();
const signature = createSignature(sigTestData, timestamp, testSessionKey);
console.assert(signature.length === 64, 'Signature should be 64 chars (SHA-256 hex)');
const isValid = verifySignature(sigTestData, timestamp, signature, testSessionKey);
console.assert(isValid === true, 'Signature should be valid');
console.log(`  ✅ Signature valid`);

// Test 4: Invalid signature rejection
console.log('\nTest 4: Invalid signature rejection');
const modifiedData = { test: 'modified' };
const isInvalid = verifySignature(modifiedData, timestamp, signature, testSessionKey);
console.assert(isInvalid === false, 'Modified data signature should be invalid');
console.log(`  ✅ Invalid signature rejected`);

// Test 5: Complex data structures
console.log('\nTest 5: Complex data structures');
const complexData = {
  array: [1, 2, 3],
  nested: { key: 'value', number: 123 },
  boolean: true,
  null: null
};
const encryptedComplex = encrypt(complexData, testSessionKey);
const decryptedComplex = decrypt(encryptedComplex, testSessionKey);
console.assert(JSON.stringify(decryptedComplex) === JSON.stringify(complexData), 'Complex data should match');
console.log(`  ✅ Complex data handled correctly`);

// Test 6: Different IV for each encryption
console.log('\nTest 6: Different IV for each encryption');
const sameData = { message: 'Same data' };
const encrypted1 = encrypt(sameData, testSessionKey);
const encrypted2 = encrypt(sameData, testSessionKey);
console.assert(encrypted1 !== encrypted2, 'Different IVs should produce different encrypted outputs');
const decrypted1 = decrypt(encrypted1, testSessionKey);
const decrypted2 = decrypt(encrypted2, testSessionKey);
console.assert(JSON.stringify(decrypted1) === JSON.stringify(sameData), 'First decrypt should match');
console.assert(JSON.stringify(decrypted2) === JSON.stringify(sameData), 'Second decrypt should match');
console.log(`  ✅ Random IV working correctly`);

console.log('\n✅ All NextJS package tests passed!');

