"""
Python client example using requests library
Demonstrates manual encryption for testing
"""

import requests
import json
import base64
import time
import os
import sys

# Add rosetta_fastapi to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'packages', 'rosetta-fastapi'))

from rosetta_fastapi.crypto import CryptoManager


class RosettaClient:
    """Python client for testing Rosetta API"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.crypto_manager = CryptoManager()
        self.shared_key = None
        
    def key_exchange(self):
        """Perform ECDH key exchange with server"""
        client_public_key = self.crypto_manager.get_public_key_base64()
        
        response = requests.post(
            f"{self.base_url}/__rosetta__/key-exchange",
            json={"clientPublicKey": client_public_key}
        )
        
        if response.status_code != 200:
            raise Exception(f"Key exchange failed: {response.status_code}")
        
        server_public_key = response.json()["serverPublicKey"]
        self.shared_key = self.crypto_manager.derive_shared_key(server_public_key)
        
        print("✓ Key exchange successful")
    
    def fetch(self, path: str, method: str = "GET", body: dict = None) -> dict:
        """Make an encrypted request"""
        if not self.shared_key:
            self.key_exchange()
        
        # Prepare payload
        payload = {
            "url": f"{self.base_url}{path}",
            "method": method,
            "headers": {},
            "body": body,
            "timestamp": int(time.time() * 1000),
            "nonce": base64.b64encode(os.urandom(16)).decode('utf-8')
        }
        
        # Encrypt
        iv = CryptoManager.generate_iv()
        ciphertext = CryptoManager.encrypt(
            json.dumps(payload),
            self.shared_key,
            iv
        )
        
        # Send request
        response = requests.post(
            f"{self.base_url}{path}",
            json={
                "encryptedPayload": base64.b64encode(ciphertext).decode('utf-8'),
                "iv": base64.b64encode(iv).decode('utf-8')
            },
            headers={"X-Rosetta-Encrypted": "true"}
        )
        
        # Decrypt response
        if response.headers.get("X-Rosetta-Encrypted") == "true":
            encrypted_response = response.json()
            response_ciphertext = base64.b64decode(encrypted_response["encryptedPayload"])
            response_iv = base64.b64decode(encrypted_response["iv"])
            
            decrypted = CryptoManager.decrypt(response_ciphertext, self.shared_key, response_iv)
            response_data = json.loads(decrypted)
            
            return response_data["body"]
        else:
            return response.json()


def main():
    print("🚀 Rosetta Python Client Example\n")
    
    client = RosettaClient("http://localhost:8000")
    
    try:
        # Test 1: GET request
        print("📝 Test 1: GET /api/data")
        data = client.fetch("/api/data")
        print(f"✓ Response: {data}\n")
        
        # Test 2: POST request
        print("📝 Test 2: POST /api/echo")
        data = client.fetch("/api/echo", method="POST", body={
            "message": "Hello from Python!",
            "timestamp": time.time()
        })
        print(f"✓ Response: {data}\n")
        
        # Test 3: GET with path parameter
        print("📝 Test 3: GET /api/user/99")
        data = client.fetch("/api/user/99")
        print(f"✓ Response: {data}\n")
        
        print("✅ All requests completed successfully!")
        print("💡 All requests and responses were encrypted end-to-end")
        print("🔒 Try copying a request from the network logs and replaying it - it will fail!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
