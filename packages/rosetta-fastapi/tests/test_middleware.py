"""
Tests for Rosetta FastAPI middleware
"""

import pytest
import json
import base64
from fastapi import FastAPI
from fastapi.testclient import TestClient
from rosetta_fastapi import RosettaMiddleware
from rosetta_fastapi.crypto import CryptoManager


@pytest.fixture
def app():
    """Create a test FastAPI app"""
    app = FastAPI()
    app.add_middleware(RosettaMiddleware, secret_key="test-secret-key")
    
    @app.get("/test")
    def test_endpoint():
        return {"message": "Hello, World!"}
    
    @app.post("/echo")
    def echo_endpoint(data: dict):
        return {"echo": data}
    
    return app


@pytest.fixture
def client(app):
    """Create a test client"""
    return TestClient(app)


def test_key_exchange(client):
    """Test ECDH key exchange"""
    # Generate client key pair
    client_crypto = CryptoManager()
    client_public_key = client_crypto.get_public_key_base64()
    
    # Perform key exchange
    response = client.post(
        "/__rosetta__/key-exchange",
        json={"clientPublicKey": client_public_key}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "serverPublicKey" in data
    assert len(data["serverPublicKey"]) > 0


def test_encrypted_request_response(client):
    """Test full encrypted request/response cycle"""
    # Step 1: Key exchange
    client_crypto = CryptoManager()
    client_public_key = client_crypto.get_public_key_base64()
    
    key_exchange_response = client.post(
        "/__rosetta__/key-exchange",
        json={"clientPublicKey": client_public_key}
    )
    
    server_public_key = key_exchange_response.json()["serverPublicKey"]
    
    # Derive shared key
    shared_key = client_crypto.derive_shared_key(server_public_key)
    
    # Step 2: Create encrypted request
    payload = {
        "url": "http://testserver/test",
        "method": "GET",
        "headers": {},
        "body": None,
        "timestamp": int(time.time() * 1000),
        "nonce": base64.b64encode(os.urandom(16)).decode('utf-8')
    }
    
    iv = CryptoManager.generate_iv()
    ciphertext = CryptoManager.encrypt(json.dumps(payload), shared_key, iv)
    
    # Step 3: Send encrypted request
    response = client.post(
        "/test",
        json={
            "encryptedPayload": base64.b64encode(ciphertext).decode('utf-8'),
            "iv": base64.b64encode(iv).decode('utf-8')
        },
        headers={"X-Rosetta-Encrypted": "true"}
    )
    
    assert response.status_code == 200
    assert response.headers.get("X-Rosetta-Encrypted") == "true"
    
    # Step 4: Decrypt response
    encrypted_response = response.json()
    response_ciphertext = base64.b64decode(encrypted_response["encryptedPayload"])
    response_iv = base64.b64decode(encrypted_response["iv"])
    
    decrypted_response = CryptoManager.decrypt(response_ciphertext, shared_key, response_iv)
    response_data = json.loads(decrypted_response)
    
    assert response_data["body"]["message"] == "Hello, World!"


def test_replay_attack_prevention(client):
    """Test that replayed requests are rejected"""
    import time
    import os
    
    # Step 1: Key exchange
    client_crypto = CryptoManager()
    client_public_key = client_crypto.get_public_key_base64()
    
    key_exchange_response = client.post(
        "/__rosetta__/key-exchange",
        json={"clientPublicKey": client_public_key}
    )
    
    server_public_key = key_exchange_response.json()["serverPublicKey"]
    shared_key = client_crypto.derive_shared_key(server_public_key)
    
    # Step 2: Create encrypted request with same nonce
    nonce = base64.b64encode(os.urandom(16)).decode('utf-8')
    
    payload = {
        "url": "http://testserver/test",
        "method": "GET",
        "headers": {},
        "body": None,
        "timestamp": int(time.time() * 1000),
        "nonce": nonce
    }
    
    iv = CryptoManager.generate_iv()
    ciphertext = CryptoManager.encrypt(json.dumps(payload), shared_key, iv)
    
    encrypted_request = {
        "encryptedPayload": base64.b64encode(ciphertext).decode('utf-8'),
        "iv": base64.b64encode(iv).decode('utf-8')
    }
    
    # Step 3: Send request (should succeed)
    response1 = client.post(
        "/test",
        json=encrypted_request,
        headers={"X-Rosetta-Encrypted": "true"}
    )
    
    assert response1.status_code == 200
    
    # Step 4: Send same request again (should fail due to nonce reuse)
    response2 = client.post(
        "/test",
        json=encrypted_request,
        headers={"X-Rosetta-Encrypted": "true"}
    )
    
    assert response2.status_code == 401
    error_data = response2.json()
    assert "Invalid or replayed request" in error_data.get("error", "")


def test_timestamp_validation(client):
    """Test that requests with old timestamps are rejected"""
    import time
    import os
    
    # Step 1: Key exchange
    client_crypto = CryptoManager()
    client_public_key = client_crypto.get_public_key_base64()
    
    key_exchange_response = client.post(
        "/__rosetta__/key-exchange",
        json={"clientPublicKey": client_public_key}
    )
    
    server_public_key = key_exchange_response.json()["serverPublicKey"]
    shared_key = client_crypto.derive_shared_key(server_public_key)
    
    # Step 2: Create encrypted request with old timestamp
    old_timestamp = int((time.time() - 400) * 1000)  # 400 seconds ago (beyond default 300s window)
    
    payload = {
        "url": "http://testserver/test",
        "method": "GET",
        "headers": {},
        "body": None,
        "timestamp": old_timestamp,
        "nonce": base64.b64encode(os.urandom(16)).decode('utf-8')
    }
    
    iv = CryptoManager.generate_iv()
    ciphertext = CryptoManager.encrypt(json.dumps(payload), shared_key, iv)
    
    # Step 3: Send request (should fail)
    response = client.post(
        "/test",
        json={
            "encryptedPayload": base64.b64encode(ciphertext).decode('utf-8'),
            "iv": base64.b64encode(iv).decode('utf-8')
        },
        headers={"X-Rosetta-Encrypted": "true"}
    )
    
    assert response.status_code == 401


def test_unencrypted_request_passthrough(client):
    """Test that unencrypted requests still work"""
    response = client.get("/test")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
