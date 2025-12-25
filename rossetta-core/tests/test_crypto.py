"""Tests for rossetta_core.crypto module."""

import json
import time
import pytest

from rossetta_core.crypto import (
    KeyManager,
    generate_nonce,
    generate_aes_key,
    encrypt_with_aes,
    decrypt_with_aes,
    encrypt_data,
    decrypt_data,
    encrypt_response,
    decrypt_response,
)


def test_key_manager_generation():
    """Test RSA key pair generation."""
    km = KeyManager()
    
    # Check that keys are generated
    assert km.private_key is not None
    assert km.public_key is not None
    
    # Check PEM export
    public_pem = km.get_public_key_pem()
    private_pem = km.get_private_key_pem()
    
    assert "BEGIN PUBLIC KEY" in public_pem
    assert "BEGIN PRIVATE KEY" in private_pem


def test_key_manager_load():
    """Test loading keys from PEM."""
    km = KeyManager()
    public_pem = km.get_public_key_pem()
    private_pem = km.get_private_key_pem()
    
    # Load keys
    loaded_public = KeyManager.load_public_key(public_pem)
    loaded_private = KeyManager.load_private_key(private_pem)
    
    assert loaded_public is not None
    assert loaded_private is not None


def test_generate_nonce():
    """Test nonce generation."""
    nonce1 = generate_nonce()
    nonce2 = generate_nonce()
    
    # Nonces should be different
    assert nonce1 != nonce2
    
    # Nonces should be base64 encoded strings
    assert isinstance(nonce1, str)
    assert isinstance(nonce2, str)


def test_aes_encryption_decryption():
    """Test AES encryption and decryption."""
    key = generate_aes_key()
    data = b"Hello, World!"
    
    # Encrypt
    encrypted, nonce, tag = encrypt_with_aes(data, key)
    
    # Decrypt
    decrypted = decrypt_with_aes(encrypted, key, nonce, tag)
    
    assert decrypted == data


def test_hybrid_encryption_decryption():
    """Test full hybrid encryption/decryption flow."""
    # Generate server keys
    server_km = KeyManager()
    public_pem = server_km.get_public_key_pem()
    
    # Test data
    request_data = {
        "method": "POST",
        "url": "/api/users",
        "headers": {"Content-Type": "application/json"},
        "body": {"name": "John Doe", "email": "john@example.com"}
    }
    
    # Encrypt
    encrypted_payload = encrypt_data(request_data, public_pem)
    
    # Check encrypted payload structure
    assert "encrypted_data" in encrypted_payload
    assert "encrypted_key" in encrypted_payload
    assert "nonce" in encrypted_payload
    assert "timestamp" in encrypted_payload
    assert "signature" in encrypted_payload
    
    # Decrypt
    decrypted_data = decrypt_data(encrypted_payload, server_km.private_key)
    
    # Verify decrypted data matches original
    assert decrypted_data == request_data


def test_invalid_signature():
    """Test that invalid signature is detected."""
    server_km = KeyManager()
    public_pem = server_km.get_public_key_pem()
    
    request_data = {
        "method": "GET",
        "url": "/api/data",
    }
    
    encrypted_payload = encrypt_data(request_data, public_pem)
    
    # Tamper with signature
    encrypted_payload["signature"] = "invalid_signature"
    
    # Should raise ValueError
    with pytest.raises(ValueError, match="Invalid signature"):
        decrypt_data(encrypted_payload, server_km.private_key)


def test_response_encryption_decryption():
    """Test response encryption and decryption."""
    aes_key = generate_aes_key()
    
    response_data = {
        "status": "success",
        "data": {"id": 123, "name": "Test User"}
    }
    
    # Encrypt response
    encrypted_response = encrypt_response(response_data, aes_key)
    
    assert "encrypted_data" in encrypted_response
    assert "nonce" in encrypted_response
    
    # Decrypt response
    decrypted_response = decrypt_response(encrypted_response, aes_key)
    
    assert decrypted_response == response_data


def test_timestamp_in_encrypted_request():
    """Test that timestamp is recent."""
    server_km = KeyManager()
    public_pem = server_km.get_public_key_pem()
    
    request_data = {"method": "GET", "url": "/api/test"}
    
    before = int(time.time())
    encrypted_payload = encrypt_data(request_data, public_pem)
    after = int(time.time())
    
    timestamp = encrypted_payload["timestamp"]
    
    # Timestamp should be within reasonable range
    assert before <= timestamp <= after + 1


def test_replay_attack_detection_different_nonces():
    """Test that each request has a unique nonce."""
    server_km = KeyManager()
    public_pem = server_km.get_public_key_pem()
    
    request_data = {"method": "GET", "url": "/api/test"}
    
    # Create two encrypted requests
    encrypted1 = encrypt_data(request_data, public_pem)
    encrypted2 = encrypt_data(request_data, public_pem)
    
    # Nonces should be different
    assert encrypted1["nonce"] != encrypted2["nonce"]
    
    # Encrypted data should be different (due to different AES keys)
    assert encrypted1["encrypted_data"] != encrypted2["encrypted_data"]
