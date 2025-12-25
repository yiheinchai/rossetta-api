"use strict";
/**
 * Cryptographic utilities for Rossetta Client
 * Uses Web Crypto API for browser-based encryption
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNonce = generateNonce;
exports.generateAESKey = generateAESKey;
exports.exportAESKey = exportAESKey;
exports.importAESKey = importAESKey;
exports.importPublicKey = importPublicKey;
exports.encryptWithAES = encryptWithAES;
exports.decryptWithAES = decryptWithAES;
exports.encryptWithRSA = encryptWithRSA;
exports.createSignature = createSignature;
exports.arrayBufferToBase64 = arrayBufferToBase64;
exports.base64ToArrayBuffer = base64ToArrayBuffer;
exports.combineArrayBuffers = combineArrayBuffers;
/**
 * Generate a cryptographically secure random nonce
 */
function generateNonce(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return arrayBufferToBase64(array.buffer);
}
/**
 * Generate AES-256 key
 */
async function generateAESKey() {
    return await crypto.subtle.generateKey({
        name: 'AES-GCM',
        length: 256,
    }, true, ['encrypt', 'decrypt']);
}
/**
 * Export AES key as raw bytes
 */
async function exportAESKey(key) {
    return await crypto.subtle.exportKey('raw', key);
}
/**
 * Import AES key from raw bytes
 */
async function importAESKey(keyData) {
    return await crypto.subtle.importKey('raw', keyData, {
        name: 'AES-GCM',
        length: 256,
    }, true, ['encrypt', 'decrypt']);
}
/**
 * Import RSA public key from PEM string
 */
async function importPublicKey(pemKey) {
    // Remove PEM header/footer and whitespace
    const pemContents = pemKey
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');
    // Base64 decode
    const binaryDer = base64ToArrayBuffer(pemContents);
    // Import as RSA-OAEP key
    return await crypto.subtle.importKey('spki', binaryDer, {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
    }, true, ['encrypt']);
}
/**
 * Encrypt data using AES-GCM
 */
async function encryptWithAES(data, key) {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: nonce,
        tagLength: 128,
    }, key, data);
    // In AES-GCM, the tag is appended to the ciphertext
    // Split them: last 16 bytes are tag, rest is ciphertext
    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, -16);
    const tag = encryptedArray.slice(-16);
    return {
        ciphertext: ciphertext.buffer,
        nonce: nonce.buffer,
        tag: tag.buffer,
    };
}
/**
 * Decrypt data using AES-GCM
 */
async function decryptWithAES(ciphertext, key, nonce, tag) {
    // Combine ciphertext and tag
    const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(new Uint8Array(tag), ciphertext.byteLength);
    return await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv: nonce,
        tagLength: 128,
    }, key, combined);
}
/**
 * Encrypt data using RSA-OAEP
 */
async function encryptWithRSA(data, publicKey) {
    return await crypto.subtle.encrypt({
        name: 'RSA-OAEP',
    }, publicKey, data);
}
/**
 * Create signature (SHA-256 hash) of data
 */
async function createSignature(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return arrayBufferToBase64(hashBuffer);
}
/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
/**
 * Combine multiple ArrayBuffers
 */
function combineArrayBuffers(...buffers) {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        result.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }
    return result.buffer;
}
