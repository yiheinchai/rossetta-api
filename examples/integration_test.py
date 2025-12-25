"""
Integration test script
Tests the complete flow between client and server
"""

import asyncio
import sys
import os
import time

# Add parent directory to path to import rosetta_fastapi
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'packages', 'rosetta-fastapi'))

from fastapi import FastAPI
from rosetta_fastapi import RosettaMiddleware
import uvicorn
import threading
import json
import base64
from rosetta_fastapi.crypto import CryptoManager


def create_test_app():
    """Create a test FastAPI application"""
    app = FastAPI()
    app.add_middleware(RosettaMiddleware, secret_key="test-secret-key")
    
    @app.get("/api/hello")
    def hello():
        return {"message": "Hello, World!", "encrypted": True}
    
    @app.post("/api/echo")
    def echo(data: dict):
        return {"echo": data, "received": True}
    
    @app.get("/api/user/{user_id}")
    def get_user(user_id: int):
        return {"user_id": user_id, "name": f"User {user_id}"}
    
    return app


def run_server():
    """Run the test server in a separate thread"""
    app = create_test_app()
    config = uvicorn.Config(app, host="127.0.0.1", port=8888, log_level="error")
    server = uvicorn.Server(config)
    server.run()


def test_integration():
    """Run integration tests"""
    print("🚀 Starting Rosetta API Integration Tests\n")
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    time.sleep(2)
    
    print("✓ Server started on http://127.0.0.1:8888\n")
    
    # Test 1: Key Exchange
    print("📝 Test 1: Key Exchange")
    try:
        import requests
        
        # Create client crypto manager
        client_crypto = CryptoManager()
        client_public_key = client_crypto.get_public_key_base64()
        
        # Perform key exchange
        response = requests.post(
            "http://127.0.0.1:8888/__rosetta__/key-exchange",
            json={"clientPublicKey": client_public_key}
        )
        
        if response.status_code == 200:
            server_public_key = response.json()["serverPublicKey"]
            shared_key = client_crypto.derive_shared_key(server_public_key)
            print(f"✓ Key exchange successful (shared key: {len(shared_key)} bytes)\n")
        else:
            print(f"✗ Key exchange failed: {response.status_code}\n")
            return False
    except Exception as e:
        print(f"✗ Key exchange error: {e}\n")
        return False
    
    # Test 2: Encrypted Request/Response
    print("📝 Test 2: Encrypted Request/Response")
    try:
        # Prepare encrypted payload
        payload = {
            "url": "http://127.0.0.1:8888/api/hello",
            "method": "GET",
            "headers": {},
            "body": None,
            "timestamp": int(time.time() * 1000),
            "nonce": base64.b64encode(os.urandom(16)).decode('utf-8')
        }
        
        iv = CryptoManager.generate_iv()
        ciphertext = CryptoManager.encrypt(json.dumps(payload), shared_key, iv)
        
        # Send encrypted request
        response = requests.post(
            "http://127.0.0.1:8888/api/hello",
            json={
                "encryptedPayload": base64.b64encode(ciphertext).decode('utf-8'),
                "iv": base64.b64encode(iv).decode('utf-8')
            },
            headers={"X-Rosetta-Encrypted": "true"}
        )
        
        if response.status_code == 200 and response.headers.get("X-Rosetta-Encrypted") == "true":
            # Decrypt response
            encrypted_response = response.json()
            response_ciphertext = base64.b64decode(encrypted_response["encryptedPayload"])
            response_iv = base64.b64decode(encrypted_response["iv"])
            
            decrypted = CryptoManager.decrypt(response_ciphertext, shared_key, response_iv)
            response_data = json.loads(decrypted)
            
            print(f"✓ Encrypted request/response successful")
            print(f"  Response: {response_data['body']}\n")
        else:
            print(f"✗ Encrypted request failed: {response.status_code}\n")
            return False
    except Exception as e:
        print(f"✗ Encrypted request error: {e}\n")
        return False
    
    # Test 3: Replay Attack Prevention
    print("📝 Test 3: Replay Attack Prevention")
    try:
        # Use same nonce to simulate replay attack
        nonce = base64.b64encode(os.urandom(16)).decode('utf-8')
        
        payload = {
            "url": "http://127.0.0.1:8888/api/hello",
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
        
        # First request should succeed
        response1 = requests.post(
            "http://127.0.0.1:8888/api/hello",
            json=encrypted_request,
            headers={"X-Rosetta-Encrypted": "true"}
        )
        
        # Second request with same nonce should fail
        response2 = requests.post(
            "http://127.0.0.1:8888/api/hello",
            json=encrypted_request,
            headers={"X-Rosetta-Encrypted": "true"}
        )
        
        if response1.status_code == 200 and response2.status_code == 401:
            print(f"✓ Replay attack correctly prevented")
            print(f"  First request: {response1.status_code}")
            print(f"  Replayed request: {response2.status_code}\n")
        else:
            print(f"✗ Replay attack not prevented properly\n")
            return False
    except Exception as e:
        print(f"✗ Replay attack test error: {e}\n")
        return False
    
    # Test 4: Unencrypted Request Passthrough
    print("📝 Test 4: Unencrypted Request Passthrough")
    try:
        response = requests.get("http://127.0.0.1:8888/api/hello")
        
        if response.status_code == 200:
            print(f"✓ Unencrypted requests still work")
            print(f"  Response: {response.json()}\n")
        else:
            print(f"✗ Unencrypted request failed: {response.status_code}\n")
            return False
    except Exception as e:
        print(f"✗ Unencrypted request error: {e}\n")
        return False
    
    print("=" * 50)
    print("✅ All integration tests passed!")
    print("=" * 50)
    return True


if __name__ == "__main__":
    try:
        success = test_integration()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Test suite error: {e}")
        sys.exit(1)
