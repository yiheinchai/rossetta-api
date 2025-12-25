"""
Cryptographic utilities for end-to-end encryption
Uses cryptography library for Python
"""

import base64
import json
import os
from typing import Tuple
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend


class CryptoManager:
    """Manages cryptographic operations for Rosetta API"""
    
    def __init__(self):
        """Initialize with a new ECDH key pair"""
        self.private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        self.public_key = self.private_key.public_key()
    
    def get_public_key_bytes(self) -> bytes:
        """Export public key as bytes"""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
    
    def get_public_key_base64(self) -> str:
        """Export public key as base64 string"""
        return base64.b64encode(self.get_public_key_bytes()).decode('utf-8')
    
    def derive_shared_key(self, peer_public_key_base64: str) -> bytes:
        """Derive shared AES key from peer's public key"""
        # Decode peer's public key
        peer_public_key_bytes = base64.b64decode(peer_public_key_base64)
        peer_public_key = serialization.load_der_public_key(
            peer_public_key_bytes,
            backend=default_backend()
        )
        
        # Perform ECDH key exchange
        shared_secret = self.private_key.exchange(ec.ECDH(), peer_public_key)
        
        # Derive AES key using HKDF
        derived_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits for AES-256
            salt=None,
            info=b'rosetta-api-encryption',
            backend=default_backend()
        ).derive(shared_secret)
        
        return derived_key
    
    @staticmethod
    def encrypt(data: str, key: bytes, iv: bytes) -> bytes:
        """Encrypt data with AES-GCM"""
        aesgcm = AESGCM(key)
        plaintext = data.encode('utf-8')
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        return ciphertext
    
    @staticmethod
    def decrypt(ciphertext: bytes, key: bytes, iv: bytes) -> str:
        """Decrypt data with AES-GCM"""
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        return plaintext.decode('utf-8')
    
    @staticmethod
    def generate_iv() -> bytes:
        """Generate random IV for AES-GCM (12 bytes for GCM)"""
        return os.urandom(12)
