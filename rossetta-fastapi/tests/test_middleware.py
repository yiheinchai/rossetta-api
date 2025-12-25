"""Tests for FastAPI middleware."""

import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from rossetta_fastapi import RossettaMiddleware
from rossetta_core.crypto import KeyManager, encrypt_data


@pytest.fixture
def app():
    """Create test FastAPI app."""
    app = FastAPI()
    
    @app.get("/api/test")
    async def test_get():
        return {"message": "Hello, World!"}
    
    @app.post("/api/users")
    async def create_user(user: dict):
        return {"id": 1, **user}
    
    return app


@pytest.fixture
def app_with_middleware(app):
    """Create app with Rossetta middleware."""
    key_manager = KeyManager()
    app.add_middleware(RossettaMiddleware, key_manager=key_manager)
    return app, key_manager


def test_public_key_endpoint(app_with_middleware):
    """Test that public key endpoint works."""
    app, key_manager = app_with_middleware
    client = TestClient(app)
    
    response = client.get("/.well-known/rossetta-public-key")
    
    assert response.status_code == 200
    data = response.json()
    assert "public_key" in data
    assert "BEGIN PUBLIC KEY" in data["public_key"]


def test_unencrypted_request_passthrough(app_with_middleware):
    """Test that unencrypted requests still work."""
    app, _ = app_with_middleware
    client = TestClient(app)
    
    response = client.get("/api/test")
    
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}


def test_encrypted_request_get(app_with_middleware):
    """Test encrypted GET request."""
    app, key_manager = app_with_middleware
    client = TestClient(app)
    
    # Get public key
    public_key = key_manager.get_public_key_pem()
    
    # Prepare request data
    request_data = {
        "method": "GET",
        "url": "/api/test",
        "headers": {},
        "body": None
    }
    
    # Encrypt request
    encrypted_payload = encrypt_data(request_data, public_key)
    
    # Send encrypted request
    response = client.post(
        "/api/test",
        json=encrypted_payload,
        headers={"content-type": "application/vnd.rossetta.encrypted+json"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.rossetta.encrypted+json"
    
    # Response should be encrypted
    response_data = response.json()
    assert "encrypted_data" in response_data
    assert "nonce" in response_data


def test_encrypted_request_post(app_with_middleware):
    """Test encrypted POST request."""
    app, key_manager = app_with_middleware
    client = TestClient(app)
    
    # Get public key
    public_key = key_manager.get_public_key_pem()
    
    # Prepare request data
    request_data = {
        "method": "POST",
        "url": "/api/users",
        "headers": {"Content-Type": "application/json"},
        "body": {"name": "John Doe", "email": "john@example.com"}
    }
    
    # Encrypt request
    encrypted_payload = encrypt_data(request_data, public_key)
    
    # Send encrypted request
    response = client.post(
        "/api/users",
        json=encrypted_payload,
        headers={"content-type": "application/vnd.rossetta.encrypted+json"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.rossetta.encrypted+json"


def test_replay_attack_prevention(app_with_middleware):
    """Test that replay attacks are prevented."""
    app, key_manager = app_with_middleware
    client = TestClient(app)
    
    # Get public key
    public_key = key_manager.get_public_key_pem()
    
    # Prepare request data
    request_data = {
        "method": "GET",
        "url": "/api/test",
        "headers": {},
        "body": None
    }
    
    # Encrypt request
    encrypted_payload = encrypt_data(request_data, public_key)
    
    # First request should succeed
    response1 = client.post(
        "/api/test",
        json=encrypted_payload,
        headers={"content-type": "application/vnd.rossetta.encrypted+json"}
    )
    assert response1.status_code == 200
    
    # Second request with same payload should fail (replay attack)
    response2 = client.post(
        "/api/test",
        json=encrypted_payload,
        headers={"content-type": "application/vnd.rossetta.encrypted+json"}
    )
    assert response2.status_code == 400
    assert "replay attack" in response2.json()["error"].lower()


def test_expired_timestamp(app_with_middleware):
    """Test that expired timestamps are rejected."""
    app, key_manager = app_with_middleware
    
    # Create middleware with very short timestamp window
    app_short_window = FastAPI()
    
    @app_short_window.get("/api/test")
    async def test_get():
        return {"message": "Hello"}
    
    app_short_window.add_middleware(
        RossettaMiddleware,
        key_manager=key_manager,
        max_timestamp_diff=1  # 1 second
    )
    
    client = TestClient(app_short_window)
    public_key = key_manager.get_public_key_pem()
    
    # Prepare request with old timestamp
    request_data = {
        "method": "GET",
        "url": "/api/test",
        "headers": {},
        "body": None
    }
    
    encrypted_payload = encrypt_data(request_data, public_key)
    
    # Modify timestamp to be old
    import time
    encrypted_payload["timestamp"] = int(time.time()) - 10
    
    # Update signature with new timestamp
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    
    signature_data = f"{encrypted_payload['encrypted_data']}{encrypted_payload['nonce']}{encrypted_payload['timestamp']}".encode('utf-8')
    digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
    digest.update(signature_data)
    encrypted_payload["signature"] = base64.b64encode(digest.finalize()).decode('utf-8')
    
    # Request should fail
    response = client.post(
        "/api/test",
        json=encrypted_payload,
        headers={"content-type": "application/vnd.rossetta.encrypted+json"}
    )
    
    assert response.status_code == 400
    assert "timestamp expired" in response.json()["error"].lower()
