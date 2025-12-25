"""
Tests for crypto utilities
"""

import pytest
from rosetta_fastapi.crypto import CryptoManager


def test_key_generation():
    """Test ECDH key pair generation"""
    crypto = CryptoManager()
    
    # Should have public and private keys
    assert crypto.private_key is not None
    assert crypto.public_key is not None


def test_public_key_export():
    """Test public key export"""
    crypto = CryptoManager()
    
    # Export as bytes
    pub_bytes = crypto.get_public_key_bytes()
    assert len(pub_bytes) > 0
    
    # Export as base64
    pub_base64 = crypto.get_public_key_base64()
    assert len(pub_base64) > 0
    assert isinstance(pub_base64, str)


def test_shared_key_derivation():
    """Test ECDH shared key derivation"""
    # Create two parties
    alice = CryptoManager()
    bob = CryptoManager()
    
    # Exchange public keys
    alice_public = alice.get_public_key_base64()
    bob_public = bob.get_public_key_base64()
    
    # Derive shared secrets
    alice_shared = alice.derive_shared_key(bob_public)
    bob_shared = bob.derive_shared_key(alice_public)
    
    # Both should derive the same shared secret
    assert alice_shared == bob_shared
    assert len(alice_shared) == 32  # 256 bits


def test_encryption_decryption():
    """Test AES-GCM encryption and decryption"""
    crypto = CryptoManager()
    
    # Generate a key for testing
    key = crypto.derive_shared_key(crypto.get_public_key_base64())
    
    # Test data
    plaintext = "Hello, encrypted world!"
    iv = CryptoManager.generate_iv()
    
    # Encrypt
    ciphertext = CryptoManager.encrypt(plaintext, key, iv)
    assert len(ciphertext) > 0
    assert ciphertext != plaintext.encode()
    
    # Decrypt
    decrypted = CryptoManager.decrypt(ciphertext, key, iv)
    assert decrypted == plaintext


def test_iv_generation():
    """Test IV generation"""
    iv1 = CryptoManager.generate_iv()
    iv2 = CryptoManager.generate_iv()
    
    # IVs should be 12 bytes for GCM
    assert len(iv1) == 12
    assert len(iv2) == 12
    
    # IVs should be different
    assert iv1 != iv2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
