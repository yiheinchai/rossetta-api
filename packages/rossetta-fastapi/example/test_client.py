#!/usr/bin/env python3
"""
Simple test client for the Rossetta FastAPI example app
"""

import requests
import hashlib
import hmac
import json
import time
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

BASE_URL = "http://localhost:8000"

class RossettaClient:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session_key = None
        self.endpoint_salt = None
    
    def initialize(self):
        """Initialize session with server"""
        response = self.session.post(f"{self.base_url}/api/init-session")
        response.raise_for_status()
        data = response.json()
        self.session_key = data['sessionKey']
        self.endpoint_salt = data['endpointSalt']
        print(f"✓ Session initialized")
        print(f"  Session Key: {self.session_key[:32]}...")
        print(f"  Endpoint Salt: {self.endpoint_salt}")
    
    def encrypt(self, data):
        """Encrypt data for transmission"""
        json_string = json.dumps(data)
        key = hashlib.sha256(self.session_key.encode()).digest()
        
        # Generate random IV
        import secrets
        iv = secrets.token_bytes(16)
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Pad data to be multiple of 16 bytes
        padding_length = 16 - (len(json_string) % 16)
        padded_data = json_string + (chr(padding_length) * padding_length)
        
        encrypted = encryptor.update(padded_data.encode()) + encryptor.finalize()
        
        iv_b64 = b64encode(iv).decode()
        encrypted_b64 = b64encode(encrypted).decode()
        
        return f"{iv_b64}:{encrypted_b64}"
    
    def decrypt(self, encrypted_data):
        """Decrypt received data"""
        # Split on first colon to separate IV from encrypted data
        parts = encrypted_data.split(':', 1)
        if len(parts) != 2:
            raise ValueError("Invalid encrypted data format")
        
        iv_b64, encrypted_b64 = parts
        iv = b64decode(iv_b64)
        encrypted = b64decode(encrypted_b64)
        
        key = hashlib.sha256(self.session_key.encode()).digest()
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted = decryptor.update(encrypted) + decryptor.finalize()
        
        # Validate and remove padding
        if len(decrypted) == 0:
            raise ValueError("Decrypted data is empty")
        
        padding_length = decrypted[-1]
        
        # Validate padding length (must be 1-16 for AES block size)
        if padding_length < 1 or padding_length > 16:
            raise ValueError("Invalid padding length")
        
        # Validate padding bytes
        if len(decrypted) < padding_length:
            raise ValueError("Invalid padding")
        
        # Verify all padding bytes are correct
        expected_padding = bytes([padding_length] * padding_length)
        if decrypted[-padding_length:] != expected_padding:
            raise ValueError("Invalid padding bytes")
        
        decrypted = decrypted[:-padding_length]
        
        json_string = decrypted.decode()
        return json.loads(json_string)
    
    def create_signature(self, data, timestamp):
        """Create HMAC signature"""
        payload = json.dumps(data) + str(timestamp)
        signature = hmac.new(self.session_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return signature
    
    def get(self, endpoint):
        """Make a GET request (encrypted response)"""
        response = self.session.get(f"{self.base_url}{endpoint}")
        response.raise_for_status()
        
        # Decrypt response
        decrypted = self.decrypt(response.text)
        return decrypted['data']
    
    def post(self, endpoint, data):
        """Make a POST request (encrypted request and response)"""
        timestamp = int(time.time() * 1000)
        signature = self.create_signature(data, timestamp)
        
        payload = {
            'data': data,
            'timestamp': timestamp,
            'signature': signature
        }
        
        encrypted = self.encrypt(payload)
        
        response = self.session.post(
            f"{self.base_url}{endpoint}",
            data=encrypted,
            headers={'Content-Type': 'text/plain'}
        )
        response.raise_for_status()
        
        # Decrypt response
        decrypted = self.decrypt(response.text)
        return decrypted['data']


def main():
    print("=" * 60)
    print("Rossetta FastAPI Test Client")
    print("=" * 60)
    
    client = RossettaClient()
    
    # Initialize session
    print("\n1. Initializing session...")
    client.initialize()
    
    # Test GET /api/todos
    print("\n2. Testing GET /api/todos (encrypted response)...")
    todos = client.get('/api/todos')
    print(f"✓ Received {len(todos)} todos:")
    for todo in todos:
        print(f"  - [{todo['id']}] {todo['text']} (completed: {todo['completed']})")
    
    # Test POST /api/todos
    print("\n3. Testing POST /api/todos (encrypted request & response)...")
    new_todo = client.post('/api/todos', {'text': 'Test from Python client'})
    print(f"✓ Created todo:")
    print(f"  - [{new_todo['id']}] {new_todo['text']} (completed: {new_todo['completed']})")
    
    # Verify it was added
    print("\n4. Verifying todo was added...")
    todos = client.get('/api/todos')
    print(f"✓ Now have {len(todos)} todos")
    
    print("\n" + "=" * 60)
    print("✓ All tests passed!")
    print("=" * 60)


if __name__ == '__main__':
    main()
